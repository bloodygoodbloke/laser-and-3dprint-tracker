import { chromium } from "playwright";
import { extractDurationMinutes } from "./printTime.js";

export const MAKERWORLD_DESIGN_ENDPOINT = "https://makerworld.com/api/v1/design-service/design";

export type MakerWorldImportResult = {
  title: string;
  modelUrl: string;
  creatorName: string | null;
  previewImageUrl: string | null;
  printMinutes: number | null;
  printHours: number | null;
  printRemainderMinutes: number | null;
  filamentGrams: number | null;
  filamentTypes: string[];
  filamentColours: string[];
  filaments: Array<{ type: string; colour: string; grams: number | null }>;
  profileName: string | null;
  source: {
    endpoint: string;
    fields: Record<string, string>;
  };
  missing: string[];
};

type RawFilament = { type?: unknown; color?: unknown; usedG?: unknown };
type RawInstance = {
  id?: number;
  title?: string;
  prediction?: unknown;
  weight?: unknown;
  cover?: string;
  instanceFilaments?: RawFilament[] | null;
};
export type RawDesign = {
  id?: number;
  title?: string;
  coverUrl?: string;
  designCreator?: { name?: string } | null;
  defaultInstanceId?: number;
  instances?: RawInstance[] | null;
};

export function parseMakerWorldUrlRef(rawUrl: string): { designId: string; url: URL } | null {
  let url: URL;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (host !== "makerworld.com" && !host.endsWith(".makerworld.com"))) return null;
  const match = url.pathname.match(/\/models\/(\d+)/);
  if (!match) return null;
  return { designId: match[1], url };
}

/** Accepts seconds-as-number (API "prediction") or text such as "17.5 h", "17h 30m", "1050 mins". Returns whole minutes. */
export function toMinutes(value: unknown, unit: "seconds" | "text" = "text"): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(unit === "seconds" ? value / 60 : value);
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const n = Number(text);
    return n > 0 ? Math.round(unit === "seconds" ? n / 60 : n) : null;
  }
  const minutes = extractDurationMinutes(text);
  return minutes > 0 ? minutes : null;
}

/** Accepts grams or kilograms text/number; returns grams. */
export function toGrams(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const match = String(value ?? "").trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g)?$/i);
  if (!match) return null;
  const grams = /kg/i.test(match[2] || "") ? Number(match[1]) * 1000 : Number(match[1]);
  return grams > 0 ? grams : null;
}

export function buildImportResult(design: RawDesign, designId: string, modelUrl: string): MakerWorldImportResult {
  const endpoint = `${MAKERWORLD_DESIGN_ENDPOINT}/${designId}`;
  const fields: Record<string, string> = {};
  const missing: string[] = [];

  const title = String(design.title || "").trim();
  if (title) fields.title = "title";
  else missing.push("title");

  const creatorName = String(design.designCreator?.name || "").trim() || null;
  if (creatorName) fields.creatorName = "designCreator.name";
  else missing.push("creatorName");

  // Always the first print profile; the user adjusts settings manually.
  const instance = (design.instances || []).find(Boolean) || null;
  const previewImageUrl = String(design.coverUrl || instance?.cover || "").trim() || null;
  if (design.coverUrl) fields.previewImageUrl = "coverUrl";
  else if (previewImageUrl) fields.previewImageUrl = "instances[].cover";
  else missing.push("previewImageUrl");

  const printMinutes = toMinutes(instance?.prediction, "seconds");
  if (printMinutes !== null) fields.printMinutes = "instances[].prediction (seconds)";
  else missing.push("printTime");

  const filaments = (instance?.instanceFilaments || []).filter(Boolean);
  const filamentSum = filaments.reduce((sum, f) => sum + (toGrams(f.usedG) || 0), 0);
  const filamentGrams = toGrams(instance?.weight) ?? (filamentSum > 0 ? filamentSum : null);
  if (toGrams(instance?.weight) !== null) fields.filamentGrams = "instances[].weight (g)";
  else if (filamentGrams !== null) fields.filamentGrams = "sum of instances[].instanceFilaments[].usedG";
  else missing.push("filamentGrams");

  const unique = (values: unknown[]) => [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))];
  const filamentTypes = unique(filaments.map((f) => String(f.type || "").toUpperCase()));
  const filamentColours = unique(filaments.map((f) => String(f.color || "").toUpperCase()));
  if (filamentTypes.length) fields.filamentTypes = "instances[].instanceFilaments[].type";
  else missing.push("filamentType");
  if (filamentColours.length) fields.filamentColours = "instances[].instanceFilaments[].color";
  else missing.push("filamentColour");

  const filamentList = filaments.map((f) => ({
    type: String(f.type || "").trim().toUpperCase(),
    colour: String(f.color || "").trim().toUpperCase(),
    grams: toGrams(f.usedG),
  }));
  if (filamentList.length) fields.filaments = "instances[].instanceFilaments[] (type, color, usedG)";

  if (instance) fields.instance = "instances[0] (first print profile)";

  return {
    title,
    modelUrl,
    creatorName,
    previewImageUrl,
    printMinutes,
    printHours: printMinutes === null ? null : Math.floor(printMinutes / 60),
    printRemainderMinutes: printMinutes === null ? null : printMinutes % 60,
    filamentGrams: filamentGrams === null ? null : Math.round(filamentGrams * 10) / 10,
    filamentTypes,
    filamentColours,
    filaments: filamentList,
    profileName: String(instance?.title || "").trim() || null,
    source: { endpoint, fields },
    missing,
  };
}

// Cloudflare rejects Node's TLS fingerprint (403), so fall back to the Chromium already used by fetchHtml.
export const fetchDesignJson = async (endpoint: string): Promise<RawDesign> => {
  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (response.ok && /json/i.test(response.headers.get("content-type") || "")) return (await response.json()) as RawDesign;
  } catch {
    // fall through to browser
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await (await browser.newContext()).newPage();
    const response = await page.goto(endpoint, { waitUntil: "domcontentloaded", timeout: 45000 });
    const status = response?.status() ?? 0;
    if (status >= 400) throw new Error(`MakerWorld API returned ${status}.`);
    return JSON.parse(await page.locator("body").innerText()) as RawDesign;
  } finally {
    await browser.close().catch(() => undefined);
  }
};
