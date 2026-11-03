import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createStorageService, storedNameFromPath, contentTypeForName } from "../backend/src/storage/index.ts";

const readAll = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

test("local provider is the default and honours UPLOAD_PATH", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mf-storage-"));
  const storage = createStorageService({ UPLOAD_PATH: dir });
  assert.equal(storage.provider, "local");
  assert.equal(storage.location, dir);

  await storage.put("a1.png", Buffer.from("hello"));
  assert.equal(await storage.exists("a1.png"), true);
  assert.deepEqual(await storage.list(), ["a1.png"]);
  assert.equal((await readAll((await storage.get("a1.png")).stream)).toString(), "hello");
  await assert.rejects(() => storage.put("a1.png", Buffer.from("again")), /EEXIST/);

  await storage.delete("a1.png");
  assert.equal(await storage.get("a1.png"), null);
  await storage.delete("a1.png");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("local provider rejects path traversal names", async () => {
  const storage = createStorageService({ UPLOAD_PATH: os.tmpdir() });
  await assert.rejects(() => storage.get("../secret"), /Invalid storage file name/);
  await assert.rejects(() => storage.put("sub/dir.png", Buffer.from("x")), /Invalid storage file name/);
});

test("provider detection and validation", () => {
  const conn = "DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=a2V5;EndpointSuffix=core.windows.net";
  assert.equal(createStorageService({ AZURE_STORAGE_CONNECTION_STRING: conn }).provider, "azure");
  assert.equal(createStorageService({ AZURE_STORAGE_ACCOUNT: "acct", CONTAINER_APP_NAME: "app" }).provider, "azure");
  assert.equal(createStorageService({ AZURE_STORAGE_ACCOUNT: "acct" }).provider, "local");
  assert.equal(createStorageService({ STORAGE_PROVIDER: "local", AZURE_STORAGE_CONNECTION_STRING: conn }).provider, "local");
  assert.throws(() => createStorageService({ STORAGE_PROVIDER: "azure" }), /AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT/);
  assert.throws(() => createStorageService({ STORAGE_PROVIDER: "s3" }), /Unknown STORAGE_PROVIDER/);
  const azure = createStorageService({ AZURE_STORAGE_CONNECTION_STRING: conn, AZURE_STORAGE_CONTAINER: "pics" });
  assert.equal(azure.location, "acct/pics");
});

test("stored file references map to storage names", () => {
  assert.equal(storedNameFromPath("/uploads/abc.png"), "abc.png");
  assert.equal(storedNameFromPath("/uploads/../x"), null);
  assert.equal(storedNameFromPath("https://example.com/a.png"), null);
  assert.equal(storedNameFromPath(null), null);
  assert.equal(contentTypeForName("x.svg"), "image/svg+xml");
  assert.equal(contentTypeForName("x.bin"), "application/octet-stream");
});
