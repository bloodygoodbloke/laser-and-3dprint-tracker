import "./loadEnv.js";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMakerWorldBrowserUrl, withMakerWorldPage } from "./makerworldBrowser.js";
import jobsRouter from "./routes/jobs.js";
import materialsRouter from "./routes/materials.js";
import billingRouter from "./routes/billing.js";
import adminRouter from "./routes/admin.js";
import customersRouter from "./routes/customers.js";
import suppliersRouter from "./routes/suppliers.js";
import bambuRouter from "./routes/bambu.js";
import makerworldRouter from "./routes/makerworld.js";
import estimatesRouter from "./routes/estimates.js";
import billingAuditRouter from "./routes/billing-audit.js";
import issuesRouter from "./routes/issues.js";
import modelMetadataRouter from "./routes/model-metadata.js";
import { getVersionInfo } from "./version.js";
import { authGate } from "./auth.js";
import accessRouter from "./routes/access.js";
import { storage, contentTypeForName } from "./storage/index.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.resolve(currentDirectory, "../../frontend/dist");

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"];
const requireAuth = authGate(["/health", "/version"]);
const requireAuthForFiles = authGate();

// Unauthenticated, dependency-free probe endpoint for Azure Container Apps (registered before cors/auth/static).
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Everything under /api (except health/version), uploads and the test page require sign-in.
app.use("/api", requireAuth);
app.use("/uploads", requireAuthForFiles);
app.use("/makerworld-test", requireAuthForFiles);

app.use("/api", accessRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/billing-settings", billingRouter);
app.use("/api/customers", customersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/bambu", bambuRouter);
app.use("/api/makerworld", makerworldRouter);
app.use("/api/estimates", estimatesRouter);
app.use("/api/billing-audit", billingAuditRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/models", modelMetadataRouter);
app.use("/api/admin", adminRouter);
// Uploads are streamed from the configured storage provider (local disk or Azure Blob Storage).
app.get("/uploads/:name", async (req, res) => {
  const name = String(req.params.name || "");
  try {
    const file = await storage.get(name);
    if (!file) {
      console.warn(`[storage] missing file requested: ${name} (${storage.provider}: ${storage.location})`);
      return res.status(404).json({ error: "File not found." });
    }
    res.setHeader("Content-Type", contentTypeForName(name));
    if (file.size !== undefined) res.setHeader("Content-Length", String(file.size));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (path.extname(name).toLowerCase() === ".svg") {
      res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'");
      res.setHeader("Content-Disposition", "attachment");
    }
    file.stream.on("error", (error) => {
      console.error(`[storage] stream error for ${name}`, error);
      res.destroy(error);
    });
    return file.stream.pipe(res);
  } catch (error) {
    console.error(`[storage] could not read ${name}`, error);
    return res.status(/^Invalid storage file name/.test(String((error as Error).message)) ? 400 : 502).json({ error: "File could not be read." });
  }
});
app.use(express.static(frontendDistPath));

app.get("/api/version", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getVersionInfo());
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/makerworld-test", async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();
  const targetUrl = parseMakerWorldBrowserUrl(rawUrl);
  if (!targetUrl) {
    return res.status(400).json({ error: "A valid MakerWorld URL is required." });
  }

  try {
    const result = await withMakerWorldPage(targetUrl.toString(), async (page) => {
      const html = await page.content();
      return { title: await page.title(), finalUrl: page.url(), htmlLength: html.length };
    });
    return res.json(result);
  } catch {
    return res.status(502).json({ error: "MakerWorld page test failed." });
  }
});

app.get("/{*splat}", (req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

// Bind explicitly to all IPv4 interfaces so the ACA ingress/probes can reach the container.
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});
