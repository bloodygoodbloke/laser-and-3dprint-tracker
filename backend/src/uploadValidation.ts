import path from "node:path";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".svg", ".stl", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

const startsWithBytes = (buffer: Buffer, bytes: number[]) =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);

const isValidSvg = (buffer: Buffer): boolean => {
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "").trim();
  } catch {
    return false;
  }

  if (/<!DOCTYPE|<!ENTITY/i.test(content)) return false;
  const declaration = content.match(/^<\?xml\s+version=(["'])1\.0\1(?:\s+encoding=(["'])UTF-8\2)?(?:\s+standalone=(["'])(?:yes|no)\3)?\s*\?>/i);
  if (content.startsWith("<?xml") && !declaration) return false;
  const svgContent = declaration ? content.slice(declaration[0].length).trimStart() : content;
  const rootContent = /^(?:<!--[\s\S]*?-->\s*)*<svg(?:\s[^<>]*?)?\/>\s*$/i;
  const closedRootContent = /^(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)[\s\S]*<\/svg>\s*$/i;
  if (!rootContent.test(svgContent) && !closedRootContent.test(svgContent)) return false;

  // SVG scripts, event handlers, external references and embedded documents are not needed for job previews.
  if (/<(?:[\w.-]+:)?(?:script|foreignObject|iframe|object|embed|audio|video|animate|animateTransform|set|discard)\b/i.test(svgContent)) return false;
  if (/\bon[a-z][\w:.-]*\s*=/i.test(svgContent)) return false;
  const css = svgContent.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\\([0-9a-f]{1,6})\s?/gi, (_escape, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)));
  if (/@import\b/i.test(css) || /url\(\s*(['"]?)(?!#)[^)]*\)/i.test(css) || /(?:expression|behavior|-moz-binding)\s*[:(]/i.test(css)) return false;

  const references = svgContent.matchAll(/\b(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gi);
  for (const reference of references) {
    if (!reference[2].startsWith("#")) return false;
  }
  return true;
};

const isValidBinaryStl = (buffer: Buffer): boolean => {
  if (buffer.length < 84) return false;
  const triangleCount = buffer.readUInt32LE(80);
  return triangleCount > 0 && buffer.length === 84 + triangleCount * 50;
};

const isValidAsciiStl = (buffer: Buffer): boolean => {
  let content: string;
  try {
    content = new TextDecoder("ascii", { fatal: true }).decode(buffer).trim();
  } catch {
    return false;
  }
  if (!/^solid(?:\s|$)/i.test(content) || !/\bendsolid(?:\s|$)/i.test(content)) return false;
  const facets = content.match(/\bfacet\s+normal\b/gi) || [];
  const vertices = content.match(/\bvertex\s+[-+.\deE]+\s+[-+.\deE]+\s+[-+.\deE]+\b/gi) || [];
  return facets.length > 0 && vertices.length === facets.length * 3;
};

const isValidStl = (buffer: Buffer) => isValidBinaryStl(buffer) || isValidAsciiStl(buffer);

const isValidImage = (extension: string, buffer: Buffer): boolean => {
  switch (extension) {
    case ".png":
      return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case ".jpg":
    case ".jpeg":
      return startsWithBytes(buffer, [0xff, 0xd8, 0xff]) && buffer.length >= 4 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
    case ".gif":
      return buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a");
    case ".webp":
      return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    default:
      return false;
  }
};

export const validateUploadedFile = (originalName: string, buffer: Buffer): string => {
  const extension = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new UploadValidationError("Unsupported file type. Upload an SVG, STL, PNG, JPG, WebP or GIF file.");
  }
  if (!buffer.length) throw new UploadValidationError("The uploaded file is empty.");

  const valid = extension === ".svg"
    ? isValidSvg(buffer)
    : extension === ".stl"
      ? isValidStl(buffer)
      : isValidImage(extension, buffer);

  if (!valid) {
    throw new UploadValidationError(`The file contents do not match a valid ${extension.slice(1).toUpperCase()} file.`);
  }
  return extension;
};
