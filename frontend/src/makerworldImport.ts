export type MakerWorldImportV1 = { jobName: string; modelUrl: string };

// Temporary proof of concept: derives the name from the URL slug only. No network access.
export function parseMakerWorldUrl(rawUrl: string): MakerWorldImportV1 {
  const modelUrl = rawUrl.trim();
  let url: URL;
  try {
    url = new URL(modelUrl);
  } catch {
    throw new Error("Enter a valid MakerWorld model URL.");
  }
  const host = url.hostname.toLowerCase();
  if (host !== "makerworld.com" && !host.endsWith(".makerworld.com")) {
    throw new Error("Enter a valid MakerWorld model URL.");
  }
  const match = url.pathname.match(/\/models\/(\d+)(?:-([^/]+))?/);
  if (!match) {
    throw new Error("Enter a valid MakerWorld model URL.");
  }
  let slug = match[2] || "";
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep raw slug
  }
  const words = slug.replace(/[-_]+/g, " ").trim();
  if (!words) {
    throw new Error("MakerWorld URL has no model name slug.");
  }
  return { jobName: words.charAt(0).toUpperCase() + words.slice(1), modelUrl };
}
