import { Router } from "express";
import http from "http";
import https from "https";
import { URL } from "url";

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

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
} as const;

const fetchHtml = (targetUrl: string, redirectDepth = 0): Promise<string> => new Promise((resolve, reject) => {
  if (redirectDepth > 5) {
    reject(new Error("Too many redirects fetching MakerWorld URL"));
    return;
  }

  const parsed = new URL(targetUrl);
  const requester = parsed.protocol === "http:" ? http : https;

  const request = requester.request({
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || undefined,
    path: `${parsed.pathname}${parsed.search}`,
    method: "GET",
    headers: {
      ...BROWSER_HEADERS,
      Host: parsed.hostname,
      Referer: `${parsed.protocol}//${parsed.hostname}/`,
      Origin: `${parsed.protocol}//${parsed.hostname}`,
    },
  }, (response) => {
    const statusCode = Number(response.statusCode || 0);

    if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
      const redirectUrl = new URL(String(response.headers.location), targetUrl).toString();
      fetchHtml(redirectUrl, redirectDepth + 1).then(resolve).catch(reject);
      return;
    }

    if (statusCode >= 400) {
      reject(new Error(`Failed to fetch MakerWorld page (${statusCode})`));
      return;
    }

    const chunks: Buffer[] = [];
    response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

  request.on("error", reject);
  request.setTimeout(10000, () => {
    request.destroy(new Error("Timed out fetching MakerWorld URL"));
  });
  request.end();
});

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
  const targetUrl = ensureMakerWorldUrl(String(req.body?.url || ""));
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
    const html = await fetchHtml(targetUrl);
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
