import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { MAX_UPLOAD_BYTES, UploadValidationError, validateUploadedFile } from "../backend/src/uploadValidation.ts";
import { uploadSingleFile } from "../backend/src/upload.ts";

const require = createRequire(new URL("../backend/package.json", import.meta.url));
const express = require("express");

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
const asciiStl = Buffer.from("solid part\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid part");
const binaryStl = Buffer.alloc(134);
binaryStl.writeUInt32LE(1, 80);

test("accepts SVG and STL files with matching extensions and content", () => {
  assert.equal(validateUploadedFile("preview.svg", svg), ".svg");
  assert.equal(validateUploadedFile("empty-artwork.svg", Buffer.from("<svg/>")), ".svg");
  assert.equal(validateUploadedFile("model.stl", asciiStl), ".stl");
  assert.equal(validateUploadedFile("model.stl", binaryStl), ".stl");
});

test("retains supported image uploads after validating their signatures", () => {
  assert.equal(validateUploadedFile("image.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), ".png");
  assert.equal(validateUploadedFile("image.gif", Buffer.from("GIF89a")), ".gif");
  assert.equal(validateUploadedFile("image.webp", Buffer.from("RIFFxxxxWEBP")), ".webp");
  assert.equal(validateUploadedFile("image.jpg", Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9])), ".jpg");
});

test("rejects unsupported extensions and content that does not match the extension", () => {
  assert.throws(() => validateUploadedFile("payload.txt", Buffer.from("hello")), UploadValidationError);
  assert.throws(() => validateUploadedFile("payload.svg", Buffer.from("<html></html>")), /contents do not match/);
  assert.throws(() => validateUploadedFile("payload.stl", Buffer.from("not an STL")), /contents do not match/);
  assert.throws(() => validateUploadedFile("payload.png", Buffer.from("<svg/>")), /contents do not match/);
});

test("rejects active SVG content and unsafe external references", () => {
  assert.throws(() => validateUploadedFile("script.svg", Buffer.from('<svg onload="alert(1)"></svg>')), /contents do not match/);
  assert.throws(() => validateUploadedFile("script.svg", Buffer.from("<svg><script>alert(1)</script></svg>")), /contents do not match/);
  assert.throws(() => validateUploadedFile("external.svg", Buffer.from('<svg><image href="https://example.test/a.png"/></svg>')), /contents do not match/);
  assert.throws(() => validateUploadedFile("doctype.svg", Buffer.from('<!DOCTYPE svg [<!ENTITY x "x">]><svg>&x;</svg>')), /contents do not match/);
  assert.throws(() => validateUploadedFile("stylesheet.svg", Buffer.from('<?xml-stylesheet href="https://example.test/a.css"?><svg/>')), /contents do not match/);
  assert.throws(() => validateUploadedFile("escaped-url.svg", Buffer.from('<svg><rect style="fill:u\\72l(https://example.test/x)"/></svg>')), /contents do not match/);
  assert.throws(() => validateUploadedFile("animation.svg", Buffer.from('<svg><set attributeName="href" to="javascript:alert(1)"/></svg>')), /contents do not match/);
});

test("rejects empty files", () => {
  assert.throws(() => validateUploadedFile("empty.svg", Buffer.alloc(0)), /empty/);
});

let server;
let origin;
before(async () => {
  const app = express();
  app.post("/upload", uploadSingleFile, (req, res) => res.status(200).json({ size: req.file.size }));
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  server.close();
  await once(server, "close");
});

test("rejects files larger than the upload limit with a clear 413 response", async () => {
  const form = new FormData();
  form.append("file", new Blob([Buffer.alloc(MAX_UPLOAD_BYTES + 1)], { type: "application/octet-stream" }), "large.stl");
  const response = await fetch(`${origin}/upload`, { method: "POST", body: form });
  assert.equal(response.status, 413);
  assert.match((await response.json()).error, /10 MB/);
});
