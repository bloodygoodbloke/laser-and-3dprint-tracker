/*
 * Auth middleware tests (backend/src/auth.ts) using a local signing key instead of Entra.
 * Run: node --import tsx --test scripts/auth.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const backend = path.resolve(__dirname, "..", "backend");
const load = async (name) => import(pathToFileURL(path.join(backend, "src", name)).href);
const loadDep = async (name) => import(pathToFileURL(require.resolve(name, { paths: [backend] })).href);

const startApp = async (verify, resolveMember) => {
  const { createAuthMiddleware } = await load("authMiddleware.ts");
  const express = (await loadDep("express")).default;
  const app = express();
  app.use("/api", createAuthMiddleware({ verify, resolveMember, publicPaths: ["/health"] }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/jobs", (req, res) => res.json({ workspaceId: req.auth.workspaceId }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
};

const verify = async (token) => {
  if (token === "owner") return { subject: "s1", email: "owner@example.com", name: "Owner" };
  if (token === "stranger") return { subject: "s2", email: "stranger@example.com", name: "Stranger" };
  throw new Error("bad token");
};
const resolveMember = async (claims) =>
  claims.email === "owner@example.com" ? { userId: "u1", workspaceId: "default", role: "Owner", email: claims.email, isSuperAdmin: false } : null;

test("auth middleware", async (t) => {
  const { server, base } = await startApp(verify, resolveMember);
  t.after(() => server.close());
  const get = (url, token) => fetch(base + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  await t.test("anonymous requests are rejected", async () => assert.equal((await get("/api/jobs")).status, 401));
  await t.test("invalid tokens are rejected", async () => assert.equal((await get("/api/jobs", "junk")).status, 401));
  await t.test("signed-in users without an invitation get 403", async () => assert.equal((await get("/api/jobs", "stranger")).status, 403));
  await t.test("an authorised owner can use the API", async () => {
    const res = await get("/api/jobs", "owner");
    assert.equal(res.status, 200);
    assert.equal((await res.json()).workspaceId, "default");
  });
  await t.test("health stays public", async () => assert.equal((await get("/api/health")).status, 200));
});

test("fails closed when no verifier is configured", async (t) => {
  const { server, base } = await startApp(null, resolveMember);
  t.after(() => server.close());
  assert.equal((await fetch(base + "/api/jobs", { headers: { Authorization: "Bearer owner" } })).status, 503);
});
