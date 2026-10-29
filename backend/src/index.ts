import "./loadEnv";
import express from "express";
import cors from "cors";
import path from "path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import jobsRouter from "./routes/jobs";
import materialsRouter from "./routes/materials";
import billingRouter from "./routes/billing";
import adminRouter from "./routes/admin";
import customersRouter from "./routes/customers";
import suppliersRouter from "./routes/suppliers";
import bambuRouter from "./routes/bambu";
import makerworldRouter from "./routes/makerworld";
import estimatesRouter from "./routes/estimates";
import billingAuditRouter from "./routes/billing-audit";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/billing-settings", billingRouter);
app.use("/api/customers", customersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/bambu", bambuRouter);
app.use("/api/makerworld", makerworldRouter);
app.use("/api/estimates", estimatesRouter);
app.use("/api/billing-audit", billingAuditRouter);
app.use("/api/admin", adminRouter);
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
