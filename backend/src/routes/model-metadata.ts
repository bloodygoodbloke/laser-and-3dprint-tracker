import { Router } from "express";
import * as cheerio from "cheerio";

const router = Router();
const supportedDomains = ["three-drop.com", "makerworld.com", "printables.com", "thingiverse.com", "cults3d.com"];
const maxPageBytes = 2 * 1024 * 1024;
const maxRedirects = 4;

const isSupportedHost = (hostname: string) => supportedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

const parseModelUrl = (value: unknown): URL | null => {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || !isSupportedHost(url.hostname.toLowerCase()) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
};

const readHtml = async (response: Response) => {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxPageBytes) throw new Error("The model page is too large to read.");
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxPageBytes) {
      await reader.cancel();
      throw new Error("The model page is too large to read.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
};

const fetchModelPage = async (startUrl: URL) => {
  let currentUrl = startUrl;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "MakerFlow model title lookup (workshop management app)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === maxRedirects) throw new Error("The model page redirected too many times.");
      const nextUrl = parseModelUrl(new URL(location, currentUrl).toString());
      if (!nextUrl) throw new Error("The model page redirected to an unsupported website.");
      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) throw new Error(`The model website returned ${response.status}.`);
    if (!String(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) {
      throw new Error("The model link did not return a web page.");
    }
    return { html: await readHtml(response), pageUrl: currentUrl };
  }
  throw new Error("Could not open the model page.");
};

const cleanTitle = (value: string) => value
  .replace(/\s+/g, " ")
  .replace(/\s*(?:\||[-–—])\s*(?:MakerWorld|Printables(?:\.com)?|Thingiverse|Cults3D|3Drop)(?:\s.*)?$/i, "")
  .trim();

const getTitle = (html: string, url: URL) => {
  const $ = cheerio.load(html);
  const structuredNames: string[] = [];
  $("script[type='application/ld+json']").each((_index, element) => {
    try {
      const collectNames = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          value.forEach(collectNames);
          return;
        }
        const record = value as Record<string, unknown>;
        if (typeof record.name === "string") structuredNames.push(record.name);
        collectNames(record.mainEntity);
        collectNames(record.itemListElement);
        collectNames(record.item);
        collectNames(record["@graph"]);
      };
      collectNames(JSON.parse($(element).text()));
    } catch {
      // Ignore malformed structured data and keep looking for ordinary page titles.
    }
  });
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("meta[name='title']").attr("content"),
    $("h1").first().text(),
    ...structuredNames,
    $("title").first().text(),
  ];
  const unusableTitle = /^(?:3drop|search(?: results)?|3d models?|models?|customize 3d models? to print|browse 3d models?)$/i;
  for (const candidate of candidates) {
    const title = cleanTitle(String(candidate || ""));
    if (title && !unusableTitle.test(title) && !/\b(?:search results|3d models to print|browse models)\b/i.test(title)) return title;
  }

  let rawSlug = url.pathname.split("/").filter(Boolean).pop() || "";
  try { rawSlug = decodeURIComponent(rawSlug); } catch { /* Keep the encoded slug if malformed. */ }
  const slug = rawSlug
    .replace(/^\d+[-_]+/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!slug || /^(?:3d models?|models?|search|customize)$/i.test(slug)) return "";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
};

const getImageUrl = (html: string, pageUrl: URL) => {
  const $ = cheerio.load(html);
  const candidates: string[] = [
    $("meta[property='og:image:secure_url']").attr("content") || "",
    $("meta[property='og:image']").attr("content") || "",
    $("meta[name='twitter:image']").attr("content") || "",
    $("meta[name='twitter:image:src']").attr("content") || "",
    $("meta[itemprop='image']").attr("content") || "",
    $("link[rel='image_src']").attr("href") || "",
  ];
  $("script[type='application/ld+json']").each((_index, element) => {
    try {
      const collectImages = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          value.forEach(collectImages);
          return;
        }
        const record = value as Record<string, unknown>;
        const image = record.image;
        if (typeof image === "string") candidates.push(image);
        else if (image && typeof image === "object") {
          const imageRecord = image as Record<string, unknown>;
          if (typeof imageRecord.url === "string") candidates.push(imageRecord.url);
          if (typeof imageRecord.contentUrl === "string") candidates.push(imageRecord.contentUrl);
        }
        collectImages(record.mainEntity);
        collectImages(record.itemListElement);
        collectImages(record.item);
        collectImages(record["@graph"]);
      };
      collectImages(JSON.parse($(element).text()));
    } catch {
      // Ignore malformed structured data; the page may still have Open Graph image tags.
    }
  });

  for (const candidate of candidates) {
    try {
      const imageUrl = new URL(candidate.trim(), pageUrl);
      if (imageUrl.protocol === "https:") return imageUrl.toString();
    } catch {
      // Ignore invalid image references and try the next metadata field.
    }
  }
  return null;
};

const getSourceName = (hostname: string) => {
  if (hostname.endsWith("three-drop.com")) return "3Drop";
  if (hostname.endsWith("makerworld.com")) return "MakerWorld";
  if (hostname.endsWith("printables.com")) return "Printables";
  if (hostname.endsWith("thingiverse.com")) return "Thingiverse";
  if (hostname.endsWith("cults3d.com")) return "Cults3D";
  return hostname;
};

router.post("/lookup", async (req, res) => {
  const modelUrl = parseModelUrl(req.body?.url);
  if (!modelUrl) {
    return res.status(400).json({ error: "Enter an HTTPS model page from 3Drop, Printables, MakerWorld, Thingiverse, or Cults3D." });
  }

  try {
    const { html, pageUrl } = await fetchModelPage(modelUrl);
    const title = getTitle(html, pageUrl);
    if (!title) return res.status(422).json({ error: "Could not find a model name on that page. You can enter the name manually and keep the link." });
    return res.json({ title, url: modelUrl.toString(), source: getSourceName(modelUrl.hostname.toLowerCase()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the model page.";
    return res.status(502).json({ error: `${message} You can enter the model name manually and keep the link.` });
  }
});

router.post("/preview", async (req, res) => {
  const modelUrl = parseModelUrl(req.body?.url);
  if (!modelUrl) {
    return res.status(400).json({ error: "Enter an HTTPS model page from 3Drop, Printables, MakerWorld, Thingiverse, or Cults3D." });
  }

  try {
    const { html, pageUrl } = await fetchModelPage(modelUrl);
    return res.json({ imageUrl: getImageUrl(html, pageUrl) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the model page.";
    return res.status(502).json({ error: message });
  }
});

export default router;
