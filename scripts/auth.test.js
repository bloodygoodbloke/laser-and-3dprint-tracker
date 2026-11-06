/*
 * Auth middleware tests (backend/src/auth.ts) using a local signing key instead of Entra.
 * Run: node --import tsx --test scripts/auth.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

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

test("privileged routes enforce effective membership roles", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "makerflow-auth-"));
  const oldDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  t.after(() => {
    if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldDatabaseUrl;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  execFileSync(process.execPath, [path.join(backend, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    cwd: backend, env: process.env, stdio: "pipe",
  });

  const express = (await loadDep("express")).default;
  const { createAuthMiddleware } = await load("authMiddleware.ts");
  const prisma = (await load("prisma.ts")).default;
  const admin = (await load("routes/admin.ts")).default;
  const materials = (await load("routes/materials.ts")).default;
  const access = (await load("routes/access.ts")).default;
  const customers = (await load("routes/customers.ts")).default;
  const workspace = await prisma.workspace.create({ data: { name: "Test workshop" } });
  await prisma.material.create({ data: { name: "Keep", type: "Filament", unit: "g", costPerUnit: 1, stockLevel: 1, reorderThreshold: 0 } });

  const roles = {
    owner: { role: "Owner", isSuperAdmin: false },
    admin: { role: "Owner", isSuperAdmin: true },
    staff: { role: "Staff", isSuperAdmin: false },
    "staff-admin": { role: "Staff", isSuperAdmin: true },
    unknown: { role: "Unknown", isSuperAdmin: true },
  };
  const auth = createAuthMiddleware({
    verify: async (token) => {
      if (!roles[token]) throw new Error("bad token");
      return { subject: token, email: `${token}@example.com`, name: token };
    },
    resolveMember: async (claims) => ({
      userId: claims.subject, workspaceId: workspace.id, email: claims.email, ...roles[claims.subject],
    }),
    publicPaths: ["/health", "/version"],
  });
  const app = express();
  app.use(express.json());
  app.use("/api", auth);
  app.use("/uploads", createAuthMiddleware({
    verify: async () => { throw new Error("bad token"); }, resolveMember: async () => null,
  }));
  app.get("/uploads/:name", (_req, res) => res.send("file"));
  app.use("/api", access);
  app.use("/api/admin", admin);
  app.use("/api/materials", materials);
  app.use("/api/customers", customers);
  // The admin router must also fail closed if mounted without the authentication gate.
  app.use("/unguarded-admin", admin);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (method, url, token, body) => fetch(base + url, {
    method,
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body && method !== "GET" ? { "Content-Type": "application/json" } : {}) },
    ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });

  for (const [method, url] of [
    ["GET", "/api/customers"], ["POST", "/api/customers"], ["POST", "/api/jobs/1/upload"],
    ["GET", "/uploads/health"], ["GET", "/api/admin/backup"], ["POST", "/api/admin/backup/full"],
  ]) {
    assert.equal((await request(method, url)).status, 401, `${method} ${url}`);
  }
  assert.equal((await request("POST", "/api/health")).status, 401);
  assert.equal((await request("GET", "/unguarded-admin/backup")).status, 403);
  assert.equal((await request("GET", "/api/customers", "unknown")).status, 403);
  assert.equal((await request("GET", "/api/customers", "staff")).status, 200);
  assert.equal((await request("POST", "/api/customers", "staff", { name: "Staff customer" })).status, 201);

  for (const [method, url] of [
    ...["/backup", "/backup/full", "/backup/customers", "/backup/suppliers", "/backup/machines", "/backup/billing"]
      .flatMap((route) => [["GET", `/api/admin${route}`], ["POST", `/api/admin${route}`]]),
    ["GET", "/api/admin/storage/check"],
    ["POST", "/api/materials/backup"], ["POST", "/api/materials/import-csv"], ["POST", "/api/materials/seed"],
    ["GET", "/api/access"], ["POST", "/api/access/invites"],
    ["DELETE", "/api/access/invites/id"], ["POST", "/api/access/users/id/approve"],
    ["DELETE", "/api/access/users/id/membership"],
  ]) {
    for (const token of ["staff", "staff-admin"]) {
      assert.equal((await request(method, url, token, {})).status, 403, `${token}: ${method} ${url}`);
    }
  }
  assert.equal((await prisma.material.findFirst({ where: { name: "Keep" } })).name, "Keep");
  assert.equal((await request("GET", "/api/access", "owner")).status, 403);
  assert.equal((await request("GET", "/api/access", "admin")).status, 200);
  assert.equal((await request("POST", "/api/access/invites", "admin", { email: "new@example.com", role: "Staff" })).status, 201);
  const exported = await request("GET", "/api/admin/backup/full", "owner");
  assert.equal(exported.status, 200);
  const backup = await exported.json();
  assert.equal((await request("POST", "/api/admin/backup/full", "owner", backup)).status, 200);
  assert.equal((await prisma.material.findFirst({ where: { name: "Keep" } })).name, "Keep");
  assert.equal((await request("POST", "/api/materials/import-csv", "owner", { materials: [] })).status, 200);
});
