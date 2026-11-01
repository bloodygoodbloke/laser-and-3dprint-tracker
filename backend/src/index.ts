import "./loadEnv.js";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
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
import prisma from "./prisma.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.resolve(currentDirectory, "../../frontend/dist");

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"];
const requireAuth = authGate(["/health", "/version", "/branding"]);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Everything under /api (except health/version), uploads and the test page require sign-in.
app.use("/api", requireAuth);
app.use("/uploads", requireAuth);
app.use("/makerworld-test", requireAuth);

// Public: only the business name and logo, so the sign-in page can show them before login.
app.get("/api/branding", async (_req, res) => {
  const setting = await prisma.billingSetting.findFirst();
  res.json({ businessName: setting?.businessName ?? "", businessLogoUrl: setting?.businessLogoUrl ?? "" });
});

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
app.use("/uploads", express.static(process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(currentDirectory, "..", "uploads")));
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
  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "A valid MakerWorld URL is required." });
  }

  const hostname = targetUrl.hostname.toLowerCase();
  if (targetUrl.protocol !== "https:" || (hostname !== "makerworld.com" && !hostname.endsWith(".makerworld.com"))) {
    return res.status(400).json({ error: "A valid MakerWorld URL is required." });
  }

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
    });
    page = await context.newPage();
    try {
      await page.goto(targetUrl.toString(), { waitUntil: "networkidle", timeout: 60000 });
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
      console.warn("[MakerWorld test] Timed out waiting for networkidle; returning current page details.");
    }
    const html = await page.content();
    return res.json({ title: await page.title(), finalUrl: page.url(), htmlLength: html.length });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "MakerWorld page test failed" });
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
