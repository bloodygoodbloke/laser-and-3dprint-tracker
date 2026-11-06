const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const modulePath = pathToFileURL(path.resolve(__dirname, "../backend/src/makerworldBrowser.ts")).href;

test("MakerWorld URLs require an allowed HTTPS host without credentials or custom ports", async () => {
  const { parseMakerWorldBrowserUrl } = await import(modulePath);
  for (const url of [
    "https://makerworld.com/en/models/123",
    "https://www.makerworld.com/models/123",
    "https://MAKERWORLD.COM:443/models/123",
  ]) assert.ok(parseMakerWorldBrowserUrl(url), url);
  for (const url of [
    "http://makerworld.com/", "https://makerworld.com:8443/", "******makerworld.com/",
    "https://makerworld.com.evil.example/", "https://notmakerworld.com/",
    "https://localhost/", "https://localhost.makerworld.com.evil.example/",
    "https://127.0.0.1/", "https://2130706433/", "https://0x7f000001/",
    "https://[::1]/", "https://[::ffff:127.0.0.1]/", "https://10.0.0.1/",
    "https://makerworld.com@127.0.0.1/", "https://makerworld.com./",
  ]) assert.equal(parseMakerWorldBrowserUrl(url), null, url);
});

test("DNS answers must contain only public addresses", async () => {
  const { isPublicAddress, resolvePublicMakerWorldHost } = await import(modulePath);
  for (const address of [
    "0.1.2.3", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254",
    "172.16.0.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "198.51.100.1",
    "203.0.113.1", "224.0.0.1", "240.0.0.1", "::1", "fe80::1", "fc00::1",
    "ff00::1", "::ffff:8.8.8.8", "2001:db8::1", "2002:0808:0808::1", "3fff::1",
  ]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(isPublicAddress(address), true, address);
  }
  const resolve = (addresses) => async () => addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
  assert.deepEqual(await resolvePublicMakerWorldHost("makerworld.com", resolve(["2606:4700:4700::1111", "8.8.8.8"])), [
    { address: "8.8.8.8", family: 4 }, { address: "2606:4700:4700::1111", family: 6 },
  ]);
  await assert.rejects(resolvePublicMakerWorldHost("makerworld.com", resolve(["8.8.8.8", "127.0.0.1"])));
  await assert.rejects(resolvePublicMakerWorldHost("makerworld.com", resolve([])));
  await assert.rejects(resolvePublicMakerWorldHost("localhost", resolve(["8.8.8.8"])));
});

test("browser validates every redirect and blocks all other requests", async () => {
  const { restrictBrowserRequests } = await import(modulePath);
  class Session extends EventEmitter {
    calls = [];
    async send(method, params) { this.calls.push({ method, params }); }
    request(id, url, redirectedRequestId, resourceType = "Document", method = "GET") {
      this.emit("Fetch.requestPaused", { requestId: id, redirectedRequestId, resourceType, request: { url, method } });
      return this.calls.at(-1).method;
    }
  }
  const session = new Session();
  await restrictBrowserRequests(session);
  assert.equal(session.request("0", "https://makerworld.com/models/1"), "Fetch.continueRequest");
  assert.equal(session.request("x", "https://makerworld.com/script.js", undefined, "Script"), "Fetch.failRequest");
  assert.equal(session.request("a", "https://localhost/", "0"), "Fetch.failRequest");
  assert.equal(session.request("b", "https://evil.example/", "0"), "Fetch.failRequest");
  assert.equal(session.request("c", "http://makerworld.com/", "0"), "Fetch.failRequest");
  assert.equal(session.request("d", "https://user@makerworld.com/", "0"), "Fetch.failRequest");
  assert.equal(session.request("e", "https://makerworld.com/other"), "Fetch.failRequest");
  for (let i = 1; i <= 4; i++) {
    assert.equal(session.request(String(i), `https://www.makerworld.com/${i}`, String(i - 1)), "Fetch.continueRequest");
  }
  assert.equal(session.request("5", "https://makerworld.com/5", "4"), "Fetch.failRequest");
});
