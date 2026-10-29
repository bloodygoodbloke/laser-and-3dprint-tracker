import { Router } from "express";
import { URL } from "url";
import { load } from "cheerio";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const router = Router();

type MakerWorldMetadata = {
  url: string;
  title: string;
  description: string;
  previewImageUrl: string;
  tags: string[];
  estimatedMinutes: number;
  estimatedMaterialGrams: number;
};

type MakerWorldProfile = {
  profileName: string;
  layerHeightMm: number;
  nozzleTempC: number;
  bedTempC: number;
  speedMmPerSec: number;
  infillPercent: number;
  estimatedMinutes: number;
  estimatedMaterialGrams: number;
};

export function extractPrintMetrics(html: string): {
  printTimeHours: number | null;
  materialType: string | null;
  materialWeightGrams: number | null;
} {
  const text = load(html).text();
  const timeMatch = text.match(/(\d+(\.\d+)?)\s*h/i);
  const materialMatch = text.match(/(PLA|PETG|ABS|ASA|TPU|PC|PA|NYLON)/i);
  const weightMatch = text.match(/(\d+(\.\d+)?)\s*g/i);

  return {
    printTimeHours: timeMatch ? Number(timeMatch[1]) : null,
    materialType: materialMatch ? materialMatch[1].toUpperCase() : null,
    materialWeightGrams: weightMatch ? Number(weightMatch[1]) : null,
  };
}

const isMockModeEnabled = (mockFlag?: unknown) => String(process.env.MAKERWORLD_MOCK_MODE || "").trim().toLowerCase() === "1"
  || String(mockFlag || "").trim().toLowerCase() === "1";

const buildMockMetadata = (targetUrl: string): MakerWorldMetadata => ({
  url: targetUrl,
  title: "Mock MakerWorld Model",
  description: "Mock metadata response used when live MakerWorld fetch is blocked.",
  previewImageUrl: "",
  tags: ["mock", "makerworld", "demo"],
  estimatedMinutes: 125,
  estimatedMaterialGrams: 82,
});

const buildMockProfile = (): MakerWorldProfile => ({
  profileName: "Mock MakerWorld Profile",
  layerHeightMm: 0.2,
  nozzleTempC: 220,
  bedTempC: 60,
  speedMmPerSec: 100,
  infillPercent: 15,
  estimatedMinutes: 125,
  estimatedMaterialGrams: 82,
});

const fetchHtml = async (targetUrl: string, _redirectDepth = 0, bodyLogLength = 500): Promise<string> => {
  console.log("[MakerWorld] Requested URL:", targetUrl);
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
    });
    page = await context.newPage();
    const response = await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
    const statusCode = response?.status() ?? 0;
    const responseHeaders = response ? await response.allHeaders() : {};
    const html = await page.content();

    console.log("[MakerWorld] Response status:", statusCode);
    console.log("[MakerWorld] Response headers:", responseHeaders);
    console.log(`[MakerWorld] Response body (first ${bodyLogLength} characters):`, html.slice(0, bodyLogLength));

    const bodyText = await page.locator("body").innerText().catch(() => "");
    const isCloudflareChallenge = responseHeaders["cf-mitigated"] === "challenge"
      || /just a moment|checking your browser|verify you are human|cf-challenge/i.test(`${await page.title()} ${bodyText.slice(0, 2000)}`);
    if (isCloudflareChallenge) {
      console.error("[MakerWorld] Cloudflare challenge page detected:", targetUrl);
    }

    if (statusCode >= 400) {
      throw new Error(`Failed to fetch MakerWorld page (${statusCode})`);
    }

    return html;
  } catch (error) {
    console.error("[MakerWorld] Playwright navigation failed:", error instanceof Error ? error.stack : error);
    throw error;
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
};

const decodeHtml = (value: string) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .trim();

const extractMeta = (html: string, key: string) => {
  const byName = new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i");
  const byProperty = new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i");
  const nameMatch = html.match(byName);
  if (nameMatch?.[1]) return decodeHtml(nameMatch[1]);
  const propertyMatch = html.match(byProperty);
  if (propertyMatch?.[1]) return decodeHtml(propertyMatch[1]);
  return "";
};

const parseMinutes = (text: string) => {
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/i);
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)/i);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (hours || minutes) return Math.round((hours * 60) + minutes);

  const plainMinutes = text.match(/(\d{2,4})\s*(?:min|minutes)/i);
  if (plainMinutes?.[1]) return Number(plainMinutes[1]);

  return 0;
};

const parseMaterialGrams = (text: string) => {
  const gramsMatch = text.match(/(\d+(?:\.\d+)?)\s*(g|grams)/i);
  if (gramsMatch?.[1]) return Number(gramsMatch[1]);

  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms)/i);
  if (kgMatch?.[1]) return Number(kgMatch[1]) * 1000;

  return 0;
};

const extractTags = (html: string) => {
  const keywords = extractMeta(html, "keywords");
  if (!keywords) return [];
  return keywords
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const extractTitleFromUrl = (targetUrl: string) => {
  const parsed = new URL(targetUrl);
  const lastSegment = parsed.pathname.split("/").filter(Boolean).pop() || "MakerWorld Model";
  return lastSegment.replace(/[-_]+/g, " ").trim() || "MakerWorld Model";
};

const buildMetadata = (targetUrl: string, html: string): MakerWorldMetadata => {
  const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractMeta(html, "title") || extractTitleFromUrl(targetUrl);
  const description = extractMeta(html, "og:description") || extractMeta(html, "description") || "Imported from MakerWorld";
  const previewImageUrl = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
  const tags = extractTags(html);

  const estimateText = `${title} ${description} ${html.slice(0, 12000)}`;
  const estimatedMinutes = parseMinutes(estimateText);
  const estimatedMaterialGrams = parseMaterialGrams(estimateText);

  return {
    url: targetUrl,
    title,
    description,
    previewImageUrl,
    tags,
    estimatedMinutes,
    estimatedMaterialGrams,
  };
};

const buildPrintProfile = (metadata: MakerWorldMetadata, html: string): MakerWorldProfile => {
  const layerHeight = Number((html.match(/layer\s*height[^\d]*(\d+(?:\.\d+)?)/i) || [])[1] || 0.2);
  const nozzleTemp = Number((html.match(/nozzle[^\d]*(\d{2,3})\s*(?:c|°c)/i) || [])[1] || 220);
  const bedTemp = Number((html.match(/bed[^\d]*(\d{2,3})\s*(?:c|°c)/i) || [])[1] || 60);
  const speed = Number((html.match(/(?:print\s*speed|speed)[^\d]*(\d{2,4})\s*(?:mm\/s|mms)/i) || [])[1] || 100);
  const infill = Number((html.match(/infill[^\d]*(\d{1,3})\s*%/i) || [])[1] || 15);

  return {
    profileName: `${metadata.title} profile`,
    layerHeightMm: layerHeight,
    nozzleTempC: nozzleTemp,
    bedTempC: bedTemp,
    speedMmPerSec: speed,
    infillPercent: infill,
    estimatedMinutes: metadata.estimatedMinutes,
    estimatedMaterialGrams: metadata.estimatedMaterialGrams,
  };
};

const ensureMakerWorldUrl = (targetUrl: string) => {
  const normalized = String(targetUrl || "").trim();
  if (!normalized) return "";
  if (!/^https?:\/\//i.test(normalized)) return "";

  const parsed = new URL(normalized);
  if (!parsed.hostname.toLowerCase().includes("makerworld")) return "";
  return parsed.toString();
};

router.post("/metadata", async (req, res) => {
  const targetUrl = ensureMakerWorldUrl(String(req.body?.url || ""));
  if (!targetUrl) {
    return res.status(400).json({ error: "A valid MakerWorld URL is required." });
  }

  if (isMockModeEnabled(req.query?.mock)) {
    return res.json(buildMockMetadata(targetUrl));
  }

  try {
    const html = await fetchHtml(targetUrl);
    const metadata = buildMetadata(targetUrl, html);
    res.json(metadata);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Failed to import MakerWorld metadata" });
  }
});

router.post("/autofill", async (req, res) => {
  const incomingUrl = String(req.body?.url || "");
  console.log("[MakerWorld autofill] Incoming URL:", incomingUrl);
  const targetUrl = ensureMakerWorldUrl(incomingUrl);
  if (!targetUrl) {
    return res.status(400).json({ error: "A valid MakerWorld URL is required." });
  }

  if (isMockModeEnabled(req.query?.mock)) {
    const metadata = buildMockMetadata(targetUrl);
    const jobDraft = {
      name: metadata.title,
      machineType: "BambuLab P2S Printer",
      machineRunTimeMinutes: metadata.estimatedMinutes,
      labourTimeMinutes: Math.max(10, Math.round(metadata.estimatedMinutes * 0.15)),
      status: "Pending",
      notes: metadata.description,
      sourceUrl: targetUrl,
      suggestedMaterialGrams: metadata.estimatedMaterialGrams,
      tags: metadata.tags,
      previewImageUrl: metadata.previewImageUrl,
    };
    return res.json({ metadata, jobDraft });
  }

  try {
    console.log("[MakerWorld autofill] Outbound MakerWorld URL:", targetUrl);
    const html = await fetchHtml(targetUrl, 0, 1000);
    const metadata = buildMetadata(targetUrl, html);

    const jobDraft = {
      name: metadata.title || "MakerWorld model",
      machineType: "BambuLab P2S Printer",
      machineRunTimeMinutes: Math.max(30, metadata.estimatedMinutes || 120),
      labourTimeMinutes: Math.max(10, Math.round((metadata.estimatedMinutes || 120) * 0.15)),
      status: "Pending",
      notes: metadata.description,
      sourceUrl: targetUrl,
      suggestedMaterialGrams: Math.max(0, metadata.estimatedMaterialGrams || 0),
      tags: metadata.tags,
      previewImageUrl: metadata.previewImageUrl,
    };

    res.json({ metadata, jobDraft });
  } catch (error) {
    console.error("[MakerWorld autofill] Exception stack:", error instanceof Error ? error.stack : error);
    res.status(502).json({ error: error instanceof Error ? error.message : "Failed to build MakerWorld job autofill" });
  }
});

router.post("/print-profile", async (req, res) => {
  const targetUrl = ensureMakerWorldUrl(String(req.body?.url || ""));
  if (!targetUrl) {
    return res.status(400).json({ error: "A valid MakerWorld URL is required." });
  }

  if (isMockModeEnabled(req.query?.mock)) {
    const metadata = buildMockMetadata(targetUrl);
    return res.json({ metadata, profile: buildMockProfile() });
  }

  try {
    const html = await fetchHtml(targetUrl);
    const metadata = buildMetadata(targetUrl, html);
    const profile = buildPrintProfile(metadata, html);
    res.json({ metadata, profile });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Failed to import MakerWorld print profile" });
  }
});

export default router;
