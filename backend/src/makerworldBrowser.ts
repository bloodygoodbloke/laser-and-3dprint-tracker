import { lookup } from "node:dns/promises";
import { createServer } from "node:http";
import { BlockList, connect, isIP, type Socket } from "node:net";
import { chromium, type CDPSession, type Page, type Response } from "playwright";

const maxRedirects = 4;
const timeoutMs = 30000;
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) blocked.addSubnet(address, prefix, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
}

export function parseMakerWorldBrowserUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname;
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || (host !== "makerworld.com" && !host.endsWith(".makerworld.com"))) return null;
    return url;
  } catch {
    return null;
  }
}

export async function resolvePublicMakerWorldHost(
  host: string,
  resolve: typeof lookup = lookup,
): Promise<Array<{ address: string; family: number }>> {
  if (!parseMakerWorldBrowserUrl(`https://${host}/`)) throw new Error("Untrusted destination");
  const addresses = await resolve(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Untrusted destination");
  }
  return addresses.sort((a, b) => a.family - b.family);
}

async function startProxy() {
  const sockets = new Set<Socket>();
  const server = createServer((_req, res) => { res.writeHead(403); res.end(); });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.setTimeout(timeoutMs, () => socket.destroy());
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("connect", async (req, client, head) => {
    client.on("error", () => client.destroy());
    const match = /^([a-z0-9.-]+):443$/i.exec(req.url || "");
    try {
      if (!match || head.length) throw new Error("Untrusted destination");
      const addresses = await resolvePublicMakerWorldHost(match[1]);
      if (client.destroyed) return;
      let upstream: Socket | undefined;
      client.once("close", () => upstream?.destroy());
      const tryAddress = (index: number) => {
        if (client.destroyed) return;
        if (index >= addresses.length) {
          client.destroy();
          return;
        }
        const { address, family } = addresses[index];
        const socket = connect({ host: address, family, port: 443 });
        upstream = socket;
        sockets.add(socket);
        socket.setTimeout(5000, () => socket.destroy(new Error("Connection timed out")));
        socket.on("close", () => sockets.delete(socket));
        let connected = false;
        socket.once("error", () => {
          if (connected) client.destroy();
          else tryAddress(index + 1);
        });
        socket.once("connect", () => {
          connected = true;
          socket.setTimeout(timeoutMs, () => socket.destroy());
          client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          client.pipe(socket).pipe(client);
        });
      };
      tryAddress(0);
    } catch {
      client.destroy();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Proxy unavailable");
  return {
    port: address.port,
    close: () => {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

export async function restrictBrowserRequests(session: CDPSession): Promise<void> {
  const redirects = new Map<string, number>();
  let started = false;
  await session.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  session.on("Fetch.requestPaused", (event) => {
    const count = event.redirectedRequestId ? (redirects.get(event.redirectedRequestId) ?? maxRedirects) + 1 : 0;
    const allowed = (event.redirectedRequestId ? redirects.has(event.redirectedRequestId) : !started)
      && event.resourceType === "Document" && event.request.method === "GET"
      && count <= maxRedirects && parseMakerWorldBrowserUrl(event.request.url);
    if (allowed) {
      started = true;
      redirects.set(event.requestId, count);
      if (event.redirectedRequestId) redirects.delete(event.redirectedRequestId);
    }
    void session.send(allowed ? "Fetch.continueRequest" : "Fetch.failRequest", allowed
      ? { requestId: event.requestId }
      : { requestId: event.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
  });
}

export async function withMakerWorldPage<T>(target: string, usePage: (page: Page, response: Response | null) => Promise<T>): Promise<T> {
  const url = parseMakerWorldBrowserUrl(target);
  if (!url) throw new Error("Invalid MakerWorld URL");
  const proxy = await startProxy();
  try {
    const browser = await chromium.launch({
      headless: true,
      proxy: { server: `http://127.0.0.1:${proxy.port}`, bypass: "<-loopback>" },
      args: ["--disable-quic", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
    });
    try {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        serviceWorkers: "block",
        userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
      });
      const page = await context.newPage();
      await restrictBrowserRequests(await context.newCDPSession(page));
      const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: timeoutMs });
      return await usePage(page, response);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } finally {
    proxy.close();
  }
}
