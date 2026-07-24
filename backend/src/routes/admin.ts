import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import prisma from "../prisma";

const router = Router();

const docsRoot = path.resolve(__dirname, "..", "..", "..", "docs");
const backlogPath = path.join(docsRoot, "backlog.md");
const implementationLogPath = path.join(docsRoot, "implementation-log.md");
const helpIntakeInboxPath = path.join(docsRoot, "help-intake-inbox.jsonl");

const ALLOWED_PRIORITIES = new Set(["P1 Critical", "P1 High", "P2 Medium", "P3 Low", "Integrations"]);
const BACKUP_SCHEMA_VERSION = "2026-07-24";
const OWNER_GITHUB_LOGIN = String(process.env.APP_OWNER_GITHUB_LOGIN || "").trim().toLowerCase();
const OWNER_GITHUB_LOGIN_SHA256 = String(process.env.APP_OWNER_GITHUB_LOGIN_SHA256 || "").trim().toLowerCase();
const OWNER_MICROSOFT_EMAIL = String(process.env.APP_OWNER_MICROSOFT_EMAIL || "").trim().toLowerCase();
const OWNER_MICROSOFT_EMAIL_SHA256 = String(process.env.APP_OWNER_MICROSOFT_EMAIL_SHA256 || "").trim().toLowerCase();
const OWNER_OAUTH_REDIRECT_BASE = String(process.env.APP_OWNER_OAUTH_REDIRECT_BASE || "http://localhost:4000").trim().replace(/\/$/, "");
const GITHUB_OAUTH_CLIENT_ID = String(process.env.GITHUB_OAUTH_CLIENT_ID || "").trim();
const GITHUB_OAUTH_CLIENT_SECRET = String(process.env.GITHUB_OAUTH_CLIENT_SECRET || "").trim();
const MICROSOFT_OAUTH_CLIENT_ID = String(process.env.MICROSOFT_OAUTH_CLIENT_ID || "").trim();
const MICROSOFT_OAUTH_CLIENT_SECRET = String(process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "").trim();
const OWNER_SESSION_TTL_MS = Number(process.env.APP_OWNER_SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const OWNER_SESSION_COOKIE = "app_owner_session";
const ownerSessions = new Map<string, { ownerId: string; provider: "github" | "microsoft"; expiresAt: number }>();
const ownerOauthStateStore = new Map<string, { provider: "github" | "microsoft"; expiresAt: number }>();

type RawRecord = Record<string, unknown>;

const toRecordArray = (value: unknown): RawRecord[] => Array.isArray(value)
  ? value.filter((item): item is RawRecord => Boolean(item) && typeof item === "object")
  : [];

const getFullBackupPayload = async () => {
  const [jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases, bambuDevices, bambuStatuses, bambuEvents, bambuSpools, bambuUsageLogs, bambuMaintenance, bambuFailureLogs] = await Promise.all([
    prisma.job.findMany({ include: { materials: { include: { material: true } }, cost: true } }),
    prisma.material.findMany(),
    prisma.billingSetting.findMany(),
    prisma.jobCost.findMany(),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.materialPurchase.findMany(),
    prisma.bambuDevice.findMany(),
    prisma.bambuMachineStatus.findMany(),
    prisma.bambuEvent.findMany(),
    prisma.bambuSpoolInventory.findMany(),
    prisma.bambuUsageLog.findMany(),
    prisma.bambuMaintenancePrediction.findMany(),
    prisma.bambuFailureLog.findMany(),
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    coverage: [
      "jobs",
      "job materials",
      "job costs",
      "materials",
      "customers",
      "suppliers",
      "supplier purchases",
      "billing settings",
      "theme colors",
      "machine profile settings",
      "bambu devices",
      "bambu statuses",
      "bambu events",
      "bambu spool inventory",
      "bambu usage logs",
      "bambu maintenance predictions",
      "bambu failure logs",
      "reports (derived from jobs, costs, customers, and materials)",
    ],
    jobs,
    materials,
    billingSettings,
    jobCosts,
    customers,
    suppliers,
    purchases,
    bambuDevices,
    bambuStatuses,
    bambuEvents,
    bambuSpools,
    bambuUsageLogs,
    bambuMaintenance,
    bambuFailureLogs,
  };
};

const sanitizeMarkdownCell = (value: unknown) => String(value || "")
  .replace(/\|/g, "/")
  .replace(/\r?\n+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

type HelpIntakeRequestRecord = {
  id: string;
  submittedAt: string;
  source: "help-form";
  requestType: "Bug" | "Feature Request";
  priority: "P1 Critical" | "P1 High" | "P2 Medium" | "P3 Low" | "Integrations";
  title: string;
  details: string;
};

const readHelpIntakeInbox = async (): Promise<HelpIntakeRequestRecord[]> => {
  try {
    const raw = await fs.readFile(helpIntakeInboxPath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as HelpIntakeRequestRecord)
      .filter((entry) => entry && typeof entry === "object" && entry.id && entry.title && entry.details);
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    if (fsError.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const appendHelpIntakeInbox = async (record: HelpIntakeRequestRecord) => {
  await fs.mkdir(docsRoot, { recursive: true });
  await fs.appendFile(helpIntakeInboxPath, `${JSON.stringify(record)}\n`, "utf8");
};

const createHelpRequestId = () => `REQ-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

const sha256Hex = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

const ownerIdentityMatches = (provider: "github" | "microsoft", identity: string) => {
  const normalized = identity.trim().toLowerCase();
  if (!normalized) return false;

  if (provider === "github") {
    if (OWNER_GITHUB_LOGIN && normalized === OWNER_GITHUB_LOGIN) return true;
    if (OWNER_GITHUB_LOGIN_SHA256 && sha256Hex(normalized) === OWNER_GITHUB_LOGIN_SHA256) return true;
    return false;
  }

  if (OWNER_MICROSOFT_EMAIL && normalized === OWNER_MICROSOFT_EMAIL) return true;
  if (OWNER_MICROSOFT_EMAIL_SHA256 && sha256Hex(normalized) === OWNER_MICROSOFT_EMAIL_SHA256) return true;
  return false;
};

const parseCookies = (req: Request) => {
  const raw = req.headers.cookie || "";
  const result: Record<string, string> = {};
  for (const pair of raw.split(";")) {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = decodeURIComponent(rawValue.join("=") || "");
  }
  return result;
};

const setOwnerSessionCookie = (res: Response, token: string) => {
  const maxAgeSeconds = Math.max(60, Math.floor(OWNER_SESSION_TTL_MS / 1000));
  res.setHeader("Set-Cookie", `${OWNER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
};

const clearOwnerSessionCookie = (res: Response) => {
  res.setHeader("Set-Cookie", `${OWNER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
};

const createOwnerSession = (res: Response, ownerId: string, provider: "github" | "microsoft") => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + OWNER_SESSION_TTL_MS;
  ownerSessions.set(token, { ownerId, provider, expiresAt });
  setOwnerSessionCookie(res, token);
  return { token, ownerId, provider, expiresAt };
};

const popOauthState = (state: string, provider: "github" | "microsoft") => {
  const existing = ownerOauthStateStore.get(state);
  if (!existing) return false;
  ownerOauthStateStore.delete(state);
  return existing.provider === provider && existing.expiresAt > Date.now();
};

const createOauthState = (provider: "github" | "microsoft") => {
  const state = crypto.randomBytes(24).toString("hex");
  ownerOauthStateStore.set(state, { provider, expiresAt: Date.now() + 1000 * 60 * 10 });
  return state;
};

const oauthPopupResultHtml = (success: boolean, message: string) => `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background:#0f172a; color:#e2e8f0; padding:20px;">
    <h3>${success ? "Owner login successful" : "Owner login failed"}</h3>
    <p>${message}</p>
    <p>You can close this window and return to the app.</p>
    <script>
      try { if (window.opener) window.opener.postMessage({ type: 'owner-oauth', success: ${success ? "true" : "false"} }, window.location.origin); } catch (_e) {}
      try { window.close(); } catch (_e) {}
    </script>
  </body>
</html>`;

const readOwnerSession = (req: Request) => {
  const token = parseCookies(req)[OWNER_SESSION_COOKIE];
  if (!token) return null;

  const session = ownerSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    ownerSessions.delete(token);
    return null;
  }
  return { token, ...session };
};

const requireOwnerSession = (req: Request, res: Response) => {
  const session = readOwnerSession(req);
  if (!session) {
    res.status(403).json({ error: "Owner session required" });
    return null;
  }
  return session;
};

const githubOwnerConfigured = () => Boolean(OWNER_GITHUB_LOGIN || OWNER_GITHUB_LOGIN_SHA256);
const microsoftOwnerConfigured = () => Boolean(OWNER_MICROSOFT_EMAIL || OWNER_MICROSOFT_EMAIL_SHA256);
const githubOauthConfigured = () => Boolean(GITHUB_OAUTH_CLIENT_ID && GITHUB_OAUTH_CLIENT_SECRET && githubOwnerConfigured());
const microsoftOauthConfigured = () => Boolean(MICROSOFT_OAUTH_CLIENT_ID && MICROSOFT_OAUTH_CLIENT_SECRET && microsoftOwnerConfigured());
const isOwnerAuthConfigured = () => githubOauthConfigured() || microsoftOauthConfigured();

const getOwnerAuthDiagnostics = () => {
  const github = {
    enabled: githubOauthConfigured(),
    ownerIdentityConfigured: githubOwnerConfigured(),
    clientIdConfigured: Boolean(GITHUB_OAUTH_CLIENT_ID),
    clientSecretConfigured: Boolean(GITHUB_OAUTH_CLIENT_SECRET),
    callbackUrl: `${OWNER_OAUTH_REDIRECT_BASE}/api/admin/owner/oauth/github/callback`,
  };

  const microsoft = {
    enabled: microsoftOauthConfigured(),
    ownerIdentityConfigured: microsoftOwnerConfigured(),
    clientIdConfigured: Boolean(MICROSOFT_OAUTH_CLIENT_ID),
    clientSecretConfigured: Boolean(MICROSOFT_OAUTH_CLIENT_SECRET),
    callbackUrl: `${OWNER_OAUTH_REDIRECT_BASE}/api/admin/owner/oauth/microsoft/callback`,
  };

  return {
    authConfigured: github.enabled || microsoft.enabled,
    redirectBaseConfigured: Boolean(OWNER_OAUTH_REDIRECT_BASE),
    providers: { github, microsoft },
  };
};

const extractMaxChgId = (markdown: string) => {
  const matches = markdown.match(/CHG-(\d{3})/g) || [];
  return matches.reduce((maxId, current) => {
    const parsed = Number(current.replace("CHG-", ""));
    return Number.isFinite(parsed) ? Math.max(maxId, parsed) : maxId;
  }, 0);
};

const getNextChgId = async () => {
  const [backlogMarkdown, implementationMarkdown] = await Promise.all([
    fs.readFile(backlogPath, "utf8"),
    fs.readFile(implementationLogPath, "utf8"),
  ]);

  const maxId = Math.max(extractMaxChgId(backlogMarkdown), extractMaxChgId(implementationMarkdown));
  return `CHG-${String(maxId + 1).padStart(3, "0")}`;
};

const classifyReviewPath = (requestType: string, title: string, details: string) => {
  const haystack = `${title} ${details}`.toLowerCase();
  const highRiskSignals = [
    "delete",
    "remove",
    "payment",
    "invoice total",
    "security",
    "authentication",
    "permission",
    "backup",
    "restore",
    "migration",
    "database",
    "prisma",
    "billing",
  ];
  const autoCandidateSignals = [
    "help text",
    "copy",
    "wording",
    "label",
    "placeholder",
    "tooltip",
    "readme",
    "changelog",
    "docs",
    "ui tweak",
  ];

  const hasHighRiskSignal = highRiskSignals.some((signal) => haystack.includes(signal));
  if (requestType === "Bug" || hasHighRiskSignal) {
    return {
      reviewRecommendation: "Human Review Required",
      triageReason: hasHighRiskSignal
        ? "Contains high-impact keywords (billing/data/security/restore style changes)."
        : "Bug reports default to human review before automation.",
    };
  }

  const hasAutoSignal = autoCandidateSignals.some((signal) => haystack.includes(signal));
  if (hasAutoSignal) {
    return {
      reviewRecommendation: "Auto Candidate",
      triageReason: "Looks like a low-risk content or UI refinement request.",
    };
  }

  return {
    reviewRecommendation: "Human Review Required",
    triageReason: "No strong low-risk automation signal detected.",
  };
};

const appendBacklogItem = async (row: string, todayIso: string) => {
  const backlogMarkdown = await fs.readFile(backlogPath, "utf8");
  const marker = "## Next 3";
  const markerIndex = backlogMarkdown.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Could not locate Next 3 section in docs/backlog.md");
  }

  const beforeMarker = backlogMarkdown.slice(0, markerIndex).replace(/\s*$/, "");
  const afterMarker = backlogMarkdown.slice(markerIndex);
  const withRow = `${beforeMarker}\n${row}\n\n${afterMarker}`;
  const updated = withRow.replace(/^Last updated:\s+\d{4}-\d{2}-\d{2}/m, `Last updated: ${todayIso}`);
  await fs.writeFile(backlogPath, updated, "utf8");
};

router.get("/backup", async (_req, res) => {
  const payload = await getFullBackupPayload();
  res.json(payload);
});

router.post("/backup", async (req, res) => {
  const { jobs = [], materials = [] } = req.body || {};

  await prisma.$transaction(async (tx) => {
    await tx.jobCost.deleteMany();
    await tx.job.deleteMany();
    await tx.material.deleteMany();

    for (const material of materials) {
      await tx.material.create({
        data: {
          name: material.name,
          type: material.type,
          unit: material.unit,
          color: material.color || "",
          costPerUnit: Number(material.costPerUnit || 0),
          stockLevel: Number(material.stockLevel || 0),
          reorderThreshold: Number(material.reorderThreshold || 0),
        },
      });
    }

    for (const job of jobs) {
      await tx.job.create({
        data: {
          jobNumber: job.jobNumber || `JOB-${String((jobs as Array<any>).indexOf(job) + 1).padStart(4, "0")}`,
          name: job.name,
          customer: job.customer,
          sourceUrl: String(job.sourceUrl || ""),
          machineType: job.machineType,
          estTimeMinutes: Number(job.estTimeMinutes || 0),
          machineRunTimeMinutes: Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
          labourTimeMinutes: Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0),
          dueDate: job.dueDate ? new Date(String(job.dueDate)) : null,
          queuePosition: Number(job.queuePosition || 0),
          qaChecklist: JSON.stringify(Array.isArray(job.qaChecklist) ? job.qaChecklist : []),
          qaPassed: Boolean(job.qaPassed),
          reworkCost: Number(job.reworkCost || 0),
          reworkNotes: String(job.reworkNotes || ""),
          isRush: Boolean(job.isRush),
          paymentStatus: String(job.paymentStatus || "Unpaid"),
          depositPaidAmount: Number(job.depositPaidAmount || 0),
          status: job.status,
        },
      });
    }
  });

  res.json({ restored: true, jobsCount: jobs.length, materialsCount: materials.length });
});

router.get("/backup/full", async (_req, res) => {
  const payload = await getFullBackupPayload();
  res.json(payload);
});

router.get("/backup/customers", async (_req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  res.json({ schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: new Date().toISOString(), customers });
});

router.post("/backup/customers", async (req, res) => {
  const customers = toRecordArray(req.body?.customers);

  await prisma.$transaction(async (tx) => {
    await tx.customer.deleteMany();
    for (const customer of customers) {
      await tx.customer.create({
        data: {
          name: String(customer.name || "").trim(),
          address: String(customer.address || "").trim(),
          email: String(customer.email || "").trim(),
          phone: String(customer.phone || "").trim(),
          notes: String(customer.notes || "").trim(),
        },
      });
    }
  });

  res.json({ restored: true, customersCount: customers.length });
});

router.get("/backup/suppliers", async (_req, res) => {
  const [suppliers, purchases] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.materialPurchase.findMany(),
  ]);

  res.json({
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    suppliers,
    purchases,
  });
});

router.post("/backup/suppliers", async (req, res) => {
  const suppliers = toRecordArray(req.body?.suppliers);
  const purchases = toRecordArray(req.body?.purchases);

  await prisma.$transaction(async (tx) => {
    await tx.materialPurchase.deleteMany();
    await tx.supplier.deleteMany();

    const supplierIdMap = new Map<string, string>();

    for (const supplier of suppliers) {
      const createdSupplier = await tx.supplier.create({
        data: {
          name: String(supplier.name || "").trim(),
          contactEmail: String(supplier.contactEmail || "").trim(),
          contactPhone: String(supplier.contactPhone || "").trim(),
          notes: String(supplier.notes || "").trim(),
        },
      });

      if (supplier.id && typeof supplier.id === "string") {
        supplierIdMap.set(supplier.id, createdSupplier.id);
      }
    }

    for (const purchase of purchases) {
      const supplierId = typeof purchase.supplierId === "string" ? supplierIdMap.get(purchase.supplierId) : null;
      if (!supplierId) continue;

      await tx.materialPurchase.create({
        data: {
          supplierId,
          materialName: String(purchase.materialName || "").trim(),
          quantityKg: Number(purchase.quantityKg || 0),
          totalCost: Number(purchase.totalCost || 0),
          purchasedAt: purchase.purchasedAt ? new Date(String(purchase.purchasedAt)) : new Date(),
          notes: String(purchase.notes || "").trim(),
        },
      });
    }
  });

  res.json({ restored: true, suppliersCount: suppliers.length, purchasesCount: purchases.length });
});

router.get("/backup/machines", async (_req, res) => {
  const [billingSetting, bambuDevices, bambuStatuses, bambuEvents, bambuSpools, bambuUsageLogs, bambuMaintenance, bambuFailureLogs] = await Promise.all([
    prisma.billingSetting.findFirst(),
    prisma.bambuDevice.findMany(),
    prisma.bambuMachineStatus.findMany(),
    prisma.bambuEvent.findMany(),
    prisma.bambuSpoolInventory.findMany(),
    prisma.bambuUsageLog.findMany(),
    prisma.bambuMaintenancePrediction.findMany(),
    prisma.bambuFailureLog.findMany(),
  ]);

  const machineElectricitySettings = billingSetting
    ? (typeof billingSetting.machineElectricitySettings === "string" ? JSON.parse(billingSetting.machineElectricitySettings || "{}") : billingSetting.machineElectricitySettings)
    : {};

  res.json({
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    machineElectricitySettings,
    bambuDevices,
    bambuStatuses,
    bambuEvents,
    bambuSpools,
    bambuUsageLogs,
    bambuMaintenance,
    bambuFailureLogs,
  });
});

router.post("/backup/machines", async (req, res) => {
  const machineElectricitySettings = req.body?.machineElectricitySettings && typeof req.body.machineElectricitySettings === "object"
    ? req.body.machineElectricitySettings
    : {};
  const bambuDevices = toRecordArray(req.body?.bambuDevices);
  const bambuStatuses = toRecordArray(req.body?.bambuStatuses);
  const bambuEvents = toRecordArray(req.body?.bambuEvents);
  const bambuSpools = toRecordArray(req.body?.bambuSpools);
  const bambuUsageLogs = toRecordArray(req.body?.bambuUsageLogs);
  const bambuMaintenance = toRecordArray(req.body?.bambuMaintenance);
  const bambuFailureLogs = toRecordArray(req.body?.bambuFailureLogs);

  await prisma.$transaction(async (tx) => {
    await tx.bambuFailureLog.deleteMany();
    await tx.bambuMaintenancePrediction.deleteMany();
    await tx.bambuUsageLog.deleteMany();
    await tx.bambuSpoolInventory.deleteMany();
    await tx.bambuEvent.deleteMany();
    await tx.bambuMachineStatus.deleteMany();
    await tx.bambuDevice.deleteMany();

    const existingBillingSetting = await tx.billingSetting.findFirst();
    if (existingBillingSetting) {
      await tx.billingSetting.update({
        where: { id: existingBillingSetting.id },
        data: { machineElectricitySettings: JSON.stringify(machineElectricitySettings) },
      });
    } else {
      await tx.billingSetting.create({
        data: {
          machineElectricitySettings: JSON.stringify(machineElectricitySettings),
          materialTypeMarkups: "{}",
        },
      });
    }

    const existingJobs = await tx.job.findMany({ select: { id: true } });
    const existingJobIdSet = new Set(existingJobs.map((job) => job.id));
    const bambuDeviceIdMap = new Map<string, string>();

    for (const device of bambuDevices) {
      const createdDevice = await tx.bambuDevice.create({
        data: {
          name: String(device.name || "").trim() || String(device.serial || "Unknown Device"),
          serial: String(device.serial || "").trim(),
          ipAddress: String(device.ipAddress || "").trim(),
          isOnline: Boolean(device.isOnline),
          lastSeenAt: device.lastSeenAt ? new Date(String(device.lastSeenAt)) : null,
        },
      });

      if (device.id && typeof device.id === "string") {
        bambuDeviceIdMap.set(device.id, createdDevice.id);
      }
    }

    for (const status of bambuStatuses) {
      const mappedDeviceId = typeof status.deviceId === "string" ? bambuDeviceIdMap.get(status.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = typeof status.jobId === "string" && existingJobIdSet.has(status.jobId) ? status.jobId : null;

      await tx.bambuMachineStatus.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId,
          nozzleTempC: Number(status.nozzleTempC || 0),
          bedTempC: Number(status.bedTempC || 0),
          chamberTempC: Number(status.chamberTempC || 0),
          progressPct: Number(status.progressPct || 0),
          amsSummary: String(status.amsSummary || "[]"),
          errorCode: String(status.errorCode || ""),
          errorMessage: String(status.errorMessage || ""),
          reportedAt: status.reportedAt ? new Date(String(status.reportedAt)) : new Date(),
        },
      });
    }

    for (const event of bambuEvents) {
      const mappedDeviceId = typeof event.deviceId === "string" ? bambuDeviceIdMap.get(event.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = typeof event.jobId === "string" && existingJobIdSet.has(event.jobId) ? event.jobId : null;

      await tx.bambuEvent.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId,
          eventType: String(event.eventType || "UNKNOWN"),
          payload: String(event.payload || "{}"),
          createdAt: event.createdAt ? new Date(String(event.createdAt)) : new Date(),
        },
      });
    }

    for (const spool of bambuSpools) {
      const mappedDeviceId = typeof spool.deviceId === "string" ? bambuDeviceIdMap.get(spool.deviceId) : null;
      if (!mappedDeviceId) continue;

      await tx.bambuSpoolInventory.create({
        data: {
          deviceId: mappedDeviceId,
          slotName: String(spool.slotName || "").trim(),
          materialName: String(spool.materialName || "").trim(),
          color: String(spool.color || "").trim(),
          remainingGrams: Number(spool.remainingGrams || 0),
        },
      });
    }

    for (const usage of bambuUsageLogs) {
      const mappedDeviceId = typeof usage.deviceId === "string" ? bambuDeviceIdMap.get(usage.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = typeof usage.jobId === "string" && existingJobIdSet.has(usage.jobId) ? usage.jobId : null;

      await tx.bambuUsageLog.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId,
          runtimeMinutes: Number(usage.runtimeMinutes || 0),
          materialGrams: Number(usage.materialGrams || 0),
          source: String(usage.source || "event"),
          createdAt: usage.createdAt ? new Date(String(usage.createdAt)) : new Date(),
        },
      });
    }

    for (const prediction of bambuMaintenance) {
      const mappedDeviceId = typeof prediction.deviceId === "string" ? bambuDeviceIdMap.get(prediction.deviceId) : null;
      if (!mappedDeviceId) continue;

      await tx.bambuMaintenancePrediction.create({
        data: {
          deviceId: mappedDeviceId,
          component: String(prediction.component || "Unknown"),
          currentHours: Number(prediction.currentHours || 0),
          intervalHours: Number(prediction.intervalHours || 0),
          predictedDueHours: Number(prediction.predictedDueHours || 0),
          riskLevel: String(prediction.riskLevel || "Normal"),
        },
      });
    }

    for (const failure of bambuFailureLogs) {
      const mappedDeviceId = typeof failure.deviceId === "string" ? bambuDeviceIdMap.get(failure.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = typeof failure.jobId === "string" && existingJobIdSet.has(failure.jobId) ? failure.jobId : null;

      await tx.bambuFailureLog.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId,
          errorCode: String(failure.errorCode || ""),
          message: String(failure.message || ""),
          severity: String(failure.severity || "Warning"),
          isResolved: Boolean(failure.isResolved),
          createdAt: failure.createdAt ? new Date(String(failure.createdAt)) : new Date(),
          resolvedAt: failure.resolvedAt ? new Date(String(failure.resolvedAt)) : null,
        },
      });
    }
  });

  res.json({
    restored: true,
    machinesCount: Object.keys(machineElectricitySettings as Record<string, unknown>).length,
    bambuDevicesCount: bambuDevices.length,
    bambuStatusesCount: bambuStatuses.length,
    bambuEventsCount: bambuEvents.length,
    bambuSpoolsCount: bambuSpools.length,
    bambuUsageLogsCount: bambuUsageLogs.length,
    bambuMaintenanceCount: bambuMaintenance.length,
    bambuFailureLogsCount: bambuFailureLogs.length,
  });
});

router.post("/backup/full", async (req, res) => {
  const { jobs = [], materials = [], billingSettings = [], jobCosts = [], customers = [], suppliers = [], purchases = [], bambuDevices = [], bambuStatuses = [], bambuEvents = [], bambuSpools = [], bambuUsageLogs = [], bambuMaintenance = [], bambuFailureLogs = [] } = req.body || {};

  await prisma.$transaction(async (tx) => {
    await tx.bambuFailureLog.deleteMany();
    await tx.bambuMaintenancePrediction.deleteMany();
    await tx.bambuUsageLog.deleteMany();
    await tx.bambuSpoolInventory.deleteMany();
    await tx.bambuEvent.deleteMany();
    await tx.bambuMachineStatus.deleteMany();
    await tx.bambuDevice.deleteMany();
    await tx.jobCost.deleteMany();
    await tx.job.deleteMany();
    await tx.material.deleteMany();
    await tx.customer.deleteMany();
    await tx.materialPurchase.deleteMany();
    await tx.supplier.deleteMany();
    await tx.billingSetting.deleteMany();

    const materialIdMap = new Map<string, string>();

    for (const material of materials) {
      const created = await tx.material.create({
        data: {
          name: material.name,
          type: material.type,
          unit: material.unit,
          color: material.color || "",
          costPerUnit: Number(material.costPerUnit || 0),
          stockLevel: Number(material.stockLevel || 0),
          reorderThreshold: Number(material.reorderThreshold || 0),
        },
      });
      if (material.id) {
        materialIdMap.set(material.id, created.id);
      }
    }

    const billingSettingPayload = Array.isArray(billingSettings) ? billingSettings[0] : billingSettings;
    if (billingSettingPayload) {
      await tx.billingSetting.create({
        data: {
          ...billingSettingPayload,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          machineElectricitySettings: JSON.stringify(billingSettingPayload.machineElectricitySettings || {}),
          materialTypeMarkups: JSON.stringify(billingSettingPayload.materialTypeMarkups || {}),
        },
      });
    }

    for (const customer of customers) {
      await tx.customer.create({
        data: {
          name: String(customer.name || "").trim(),
          address: String(customer.address || "").trim(),
          email: String(customer.email || "").trim(),
          phone: String(customer.phone || "").trim(),
          notes: String(customer.notes || "").trim(),
        },
      });
    }

    const supplierIdMap = new Map<string, string>();
    const bambuDeviceIdMap = new Map<string, string>();
    const jobIdMap = new Map<string, string>();
    for (const supplier of suppliers) {
      const createdSupplier = await tx.supplier.create({
        data: {
          name: String(supplier.name || "").trim(),
          contactEmail: String(supplier.contactEmail || "").trim(),
          contactPhone: String(supplier.contactPhone || "").trim(),
          notes: String(supplier.notes || "").trim(),
        },
      });
      if (supplier.id) {
        supplierIdMap.set(supplier.id, createdSupplier.id);
      }
    }

    for (const purchase of purchases) {
      const mappedSupplierId = purchase.supplierId ? supplierIdMap.get(purchase.supplierId) : null;
      if (!mappedSupplierId) continue;

      await tx.materialPurchase.create({
        data: {
          supplierId: mappedSupplierId,
          materialName: String(purchase.materialName || "").trim(),
          quantityKg: Number(purchase.quantityKg || 0),
          totalCost: Number(purchase.totalCost || 0),
          purchasedAt: purchase.purchasedAt ? new Date(String(purchase.purchasedAt)) : new Date(),
          notes: String(purchase.notes || "").trim(),
        },
      });
    }

    for (const job of jobs) {
      const createdJob = await tx.job.create({
        data: {
          jobNumber: job.jobNumber || `JOB-${String((jobs as Array<any>).indexOf(job) + 1).padStart(4, "0")}`,
          name: job.name,
          customer: job.customer,
          sourceUrl: String(job.sourceUrl || ""),
          machineType: job.machineType,
          estTimeMinutes: Number(job.estTimeMinutes || 0),
          machineRunTimeMinutes: Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0),
          labourTimeMinutes: Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 0),
          dueDate: job.dueDate ? new Date(String(job.dueDate)) : null,
          queuePosition: Number(job.queuePosition || 0),
          qaChecklist: JSON.stringify(Array.isArray(job.qaChecklist) ? job.qaChecklist : []),
          qaPassed: Boolean(job.qaPassed),
          reworkCost: Number(job.reworkCost || 0),
          reworkNotes: String(job.reworkNotes || ""),
          isRush: Boolean(job.isRush),
          paymentStatus: String(job.paymentStatus || "Unpaid"),
          depositPaidAmount: Number(job.depositPaidAmount || 0),
          status: job.status,
        },
      });

      if (job.id) {
        jobIdMap.set(job.id, createdJob.id);
      }

      if (Array.isArray(job.materials)) {
        for (const entry of job.materials) {
          const materialId = entry.materialId ? materialIdMap.get(entry.materialId) ?? null : null;
          if (materialId) {
            await tx.jobMaterial.create({
              data: {
                jobId: createdJob.id,
                materialId,
                usageQuantity: Number(entry.usageQuantity || 0),
                usageUnit: entry.usageUnit || "g",
                usageUnitCost: Number(entry.usageUnitCost || 0),
              },
            });
          }
        }
      }

      const jobCost = job.cost || jobCosts.find((cost: any) => cost.jobId === job.id);
      if (jobCost) {
        await tx.jobCost.create({
          data: {
            jobId: createdJob.id,
            materialCost: Number(jobCost.materialCost || 0),
            electricityCost: Number(jobCost.electricityCost || 0),
            labourCost: Number(jobCost.labourCost || 0),
            overheadCost: Number(jobCost.overheadCost || 0),
            totalCost: Number(jobCost.totalCost || 0),
            customerCharge: Number(jobCost.customerCharge || 0),
          },
        });
      }
    }

    for (const device of bambuDevices) {
      const createdDevice = await tx.bambuDevice.create({
        data: {
          name: String(device.name || "").trim() || String(device.serial || "Unknown Device"),
          serial: String(device.serial || "").trim(),
          ipAddress: String(device.ipAddress || "").trim(),
          isOnline: Boolean(device.isOnline),
          lastSeenAt: device.lastSeenAt ? new Date(String(device.lastSeenAt)) : null,
        },
      });

      if (device.id) {
        bambuDeviceIdMap.set(device.id, createdDevice.id);
      }
    }

    for (const status of bambuStatuses) {
      const mappedDeviceId = status.deviceId ? bambuDeviceIdMap.get(status.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = status.jobId ? jobIdMap.get(status.jobId) : null;

      await tx.bambuMachineStatus.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId || null,
          nozzleTempC: Number(status.nozzleTempC || 0),
          bedTempC: Number(status.bedTempC || 0),
          chamberTempC: Number(status.chamberTempC || 0),
          progressPct: Number(status.progressPct || 0),
          amsSummary: String(status.amsSummary || "[]"),
          errorCode: String(status.errorCode || ""),
          errorMessage: String(status.errorMessage || ""),
          reportedAt: status.reportedAt ? new Date(String(status.reportedAt)) : new Date(),
        },
      });
    }

    for (const event of bambuEvents) {
      const mappedDeviceId = event.deviceId ? bambuDeviceIdMap.get(event.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = event.jobId ? jobIdMap.get(event.jobId) : null;

      await tx.bambuEvent.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId || null,
          eventType: String(event.eventType || "UNKNOWN"),
          payload: String(event.payload || "{}"),
          createdAt: event.createdAt ? new Date(String(event.createdAt)) : new Date(),
        },
      });
    }

    for (const spool of bambuSpools) {
      const mappedDeviceId = spool.deviceId ? bambuDeviceIdMap.get(spool.deviceId) : null;
      if (!mappedDeviceId) continue;

      await tx.bambuSpoolInventory.create({
        data: {
          deviceId: mappedDeviceId,
          slotName: String(spool.slotName || "").trim(),
          materialName: String(spool.materialName || "").trim(),
          color: String(spool.color || "").trim(),
          remainingGrams: Number(spool.remainingGrams || 0),
        },
      });
    }

    for (const usage of bambuUsageLogs) {
      const mappedDeviceId = usage.deviceId ? bambuDeviceIdMap.get(usage.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = usage.jobId ? jobIdMap.get(usage.jobId) : null;

      await tx.bambuUsageLog.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId || null,
          runtimeMinutes: Number(usage.runtimeMinutes || 0),
          materialGrams: Number(usage.materialGrams || 0),
          source: String(usage.source || "event"),
          createdAt: usage.createdAt ? new Date(String(usage.createdAt)) : new Date(),
        },
      });
    }

    for (const prediction of bambuMaintenance) {
      const mappedDeviceId = prediction.deviceId ? bambuDeviceIdMap.get(prediction.deviceId) : null;
      if (!mappedDeviceId) continue;

      await tx.bambuMaintenancePrediction.create({
        data: {
          deviceId: mappedDeviceId,
          component: String(prediction.component || "Unknown"),
          currentHours: Number(prediction.currentHours || 0),
          intervalHours: Number(prediction.intervalHours || 0),
          predictedDueHours: Number(prediction.predictedDueHours || 0),
          riskLevel: String(prediction.riskLevel || "Normal"),
        },
      });
    }

    for (const failure of bambuFailureLogs) {
      const mappedDeviceId = failure.deviceId ? bambuDeviceIdMap.get(failure.deviceId) : null;
      if (!mappedDeviceId) continue;
      const mappedJobId = failure.jobId ? jobIdMap.get(failure.jobId) : null;

      await tx.bambuFailureLog.create({
        data: {
          deviceId: mappedDeviceId,
          jobId: mappedJobId || null,
          errorCode: String(failure.errorCode || ""),
          message: String(failure.message || ""),
          severity: String(failure.severity || "Warning"),
          isResolved: Boolean(failure.isResolved),
          createdAt: failure.createdAt ? new Date(String(failure.createdAt)) : new Date(),
          resolvedAt: failure.resolvedAt ? new Date(String(failure.resolvedAt)) : null,
        },
      });
    }
  });

  res.json({ restored: true, jobsCount: jobs.length, materialsCount: materials.length, billingSettingsCount: Array.isArray(billingSettings) ? billingSettings.length : billingSettings ? 1 : 0, customersCount: customers.length, suppliersCount: suppliers.length, purchasesCount: purchases.length, bambuDevicesCount: bambuDevices.length, bambuStatusesCount: bambuStatuses.length, bambuEventsCount: bambuEvents.length, bambuSpoolsCount: bambuSpools.length, bambuUsageLogsCount: bambuUsageLogs.length, bambuMaintenanceCount: bambuMaintenance.length, bambuFailureLogsCount: bambuFailureLogs.length });
});

router.post("/backlog-intake", async (req, res) => {
  try {
    const requestType = sanitizeMarkdownCell(req.body?.requestType || "Feature Request");
    const title = sanitizeMarkdownCell(req.body?.title || "");
    const details = sanitizeMarkdownCell(req.body?.details || "");
    const requestedPriority = sanitizeMarkdownCell(req.body?.priority || "P3 Low");
    const priority = ALLOWED_PRIORITIES.has(requestedPriority) ? requestedPriority : "P3 Low";

    if (!title || !details) {
      return res.status(400).json({ error: "title and details are required" });
    }

    const normalizedType = requestType === "Bug" ? "Bug" : "Feature Request";
    const todayIso = new Date().toISOString().slice(0, 10);
    const nextId = await getNextChgId();
    const triage = classifyReviewPath(normalizedType, title, details);
    const reviewStatus = triage.reviewRecommendation === "Human Review Required" ? "Human Review" : "Reviewed";
    const reviewReason = triage.triageReason;
    const backlogStatus = reviewStatus === "Human Review" ? "On Hold" : "Planned";

    const detailsWithReview = [
      details,
      `[Source: Help page intake]`,
    ].join(" ");

    const row = `| ${nextId} | ${normalizedType} | ${priority} | ${backlogStatus} | ${title} | ${detailsWithReview} | ${reviewStatus} | ${reviewReason} | - |`;
    await appendBacklogItem(row, todayIso);

    res.status(201).json({
      id: nextId,
      type: normalizedType,
      priority,
      status: backlogStatus,
      reviewStatus,
      reviewReason,
      reviewRecommendation: triage.reviewRecommendation,
      triageReason: triage.triageReason,
      title,
      details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backlog intake failed";
    res.status(500).json({ error: message });
  }
});

router.post("/help-intake/log", async (req, res) => {
  try {
    const requestTypeRaw = sanitizeMarkdownCell(req.body?.requestType || "Feature Request");
    const requestedPriorityRaw = sanitizeMarkdownCell(req.body?.priority || "P3 Low");
    const title = sanitizeMarkdownCell(req.body?.title || "");
    const details = sanitizeMarkdownCell(req.body?.details || "");

    if (!title || !details) {
      return res.status(400).json({ error: "title and details are required" });
    }

    const requestType = requestTypeRaw === "Bug" ? "Bug" : "Feature Request";
    const priority = ALLOWED_PRIORITIES.has(requestedPriorityRaw)
      ? requestedPriorityRaw as HelpIntakeRequestRecord["priority"]
      : "P3 Low";

    const record: HelpIntakeRequestRecord = {
      id: createHelpRequestId(),
      submittedAt: new Date().toISOString(),
      source: "help-form",
      requestType,
      priority,
      title,
      details,
    };

    await appendHelpIntakeInbox(record);
    res.status(201).json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log help intake request";
    res.status(500).json({ error: message });
  }
});

router.get("/help-intake/export", async (_req, res) => {
  try {
    const requests = await readHelpIntakeInbox();
    res.json({ exportedAt: new Date().toISOString(), requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export help intake requests";
    res.status(500).json({ error: message });
  }
});

router.get("/owner/session", (req, res) => {
  const session = readOwnerSession(req);
  if (!session) {
    return res.json({
      isOwner: false,
      authConfigured: isOwnerAuthConfigured(),
      providers: {
        github: githubOauthConfigured(),
        microsoft: microsoftOauthConfigured(),
      },
    });
  }

  res.json({
    isOwner: true,
    ownerLogin: null,
    ownerProvider: session.provider,
    ownerEmail: null,
    authConfigured: isOwnerAuthConfigured(),
    providers: {
      github: githubOauthConfigured(),
      microsoft: microsoftOauthConfigured(),
    },
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

router.get("/owner/oauth/providers", (_req, res) => {
  const diagnostics = getOwnerAuthDiagnostics();
  res.json({
    authConfigured: isOwnerAuthConfigured(),
    ownerLogin: null,
    ownerEmail: null,
    providers: diagnostics.providers,
  });
});

router.get("/owner/oauth/diagnostics", (_req, res) => {
  res.json(getOwnerAuthDiagnostics());
});

router.get("/owner/oauth/github/start", (req, res) => {
  if (!githubOauthConfigured()) {
    return res.status(503).send("GitHub owner OAuth is not configured");
  }

  const state = createOauthState("github");
  const redirectUri = `${OWNER_OAUTH_REDIRECT_BASE}/api/admin/owner/oauth/github/callback`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  if (typeof req.query.next === "string" && req.query.next.trim()) {
    url.searchParams.set("allow_signup", "false");
  }
  res.redirect(url.toString());
});

router.get("/owner/oauth/github/callback", async (req, res) => {
  const state = String(req.query.state || "");
  const code = String(req.query.code || "");
  if (!state || !code || !popOauthState(state, "github")) {
    return res.status(400).send(oauthPopupResultHtml(false, "Invalid GitHub OAuth state."));
  }

  try {
    const redirectUri = `${OWNER_OAUTH_REDIRECT_BASE}/api/admin/owner/oauth/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        client_secret: GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenPayload = await tokenRes.json() as Record<string, unknown>;
    const accessToken = String(tokenPayload.access_token || "").trim();
    if (!accessToken) {
      return res.status(401).send(oauthPopupResultHtml(false, "GitHub token exchange failed."));
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "laser-and-3dprint-tracker",
      },
    });
    const user = await userRes.json() as Record<string, unknown>;
    const login = String(user.login || "").trim().toLowerCase();
    if (!ownerIdentityMatches("github", login)) {
      return res.status(403).send(oauthPopupResultHtml(false, "This GitHub account is not the app owner."));
    }

    const session = createOwnerSession(res, login, "github");
    return res.status(200).send(oauthPopupResultHtml(true, `Signed in as @${session.ownerId}.`));
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub owner login failed";
    return res.status(500).send(oauthPopupResultHtml(false, message));
  }
});

router.get("/owner/oauth/microsoft/start", (_req, res) => {
  if (!microsoftOauthConfigured()) {
    return res.status(503).send("Microsoft owner OAuth is not configured");
  }

  const state = createOauthState("microsoft");
  const redirectUri = `${OWNER_OAUTH_REDIRECT_BASE}/api/admin/owner/oauth/microsoft/callback`;
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", MICROSOFT_OAUTH_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email User.Read");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

router.get("/owner/oauth/microsoft/callback", async (req, res) => {
  const state = String(req.query.state || "");
  const code = String(req.query.code || "");
  if (!state || !code || !popOauthState(state, "microsoft")) {
    return res.status(400).send(oauthPopupResultHtml(false, "Invalid Microsoft OAuth state."));
  }

  try {
    const redirectUri = `${OWNER_OAUTH_REDIRECT_BASE}/api/admin/owner/oauth/microsoft/callback`;
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_OAUTH_CLIENT_ID,
        client_secret: MICROSOFT_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid profile email User.Read",
      }),
    });

    const tokenPayload = await tokenRes.json() as Record<string, unknown>;
    const accessToken = String(tokenPayload.access_token || "").trim();
    if (!accessToken) {
      return res.status(401).send(oauthPopupResultHtml(false, "Microsoft token exchange failed."));
    }

    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=userPrincipalName,mail", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });
    const me = await meRes.json() as Record<string, unknown>;
    const resolvedEmail = String(me.mail || me.userPrincipalName || "").trim().toLowerCase();
    if (!ownerIdentityMatches("microsoft", resolvedEmail)) {
      return res.status(403).send(oauthPopupResultHtml(false, "This Microsoft account is not the app owner."));
    }

    createOwnerSession(res, resolvedEmail, "microsoft");
    return res.status(200).send(oauthPopupResultHtml(true, `Signed in as ${resolvedEmail}.`));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Microsoft owner login failed";
    return res.status(500).send(oauthPopupResultHtml(false, message));
  }
});

router.delete("/owner/session", (req, res) => {
  const token = parseCookies(req)[OWNER_SESSION_COOKIE];
  if (token) {
    ownerSessions.delete(token);
  }
  clearOwnerSessionCookie(res);
  res.status(204).send();
});

router.post("/help-intake/import", async (req, res) => {
  try {
    const ownerSession = requireOwnerSession(req, res);
    if (!ownerSession) {
      return;
    }

    const imported = Array.isArray(req.body?.requests) ? req.body.requests : [];
    if (!imported.length) {
      return res.status(400).json({ error: "requests array is required" });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    let importedCount = 0;

    for (const raw of imported) {
      const requestTypeRaw = sanitizeMarkdownCell((raw as Record<string, unknown>).requestType || "Feature Request");
      const requestedPriorityRaw = sanitizeMarkdownCell((raw as Record<string, unknown>).priority || "P3 Low");
      const title = sanitizeMarkdownCell((raw as Record<string, unknown>).title || "");
      const details = sanitizeMarkdownCell((raw as Record<string, unknown>).details || "");
      const sourceId = sanitizeMarkdownCell((raw as Record<string, unknown>).id || "unknown");

      if (!title || !details) {
        continue;
      }

      const normalizedType = requestTypeRaw === "Bug" ? "Bug" : "Feature Request";
      const priority = ALLOWED_PRIORITIES.has(requestedPriorityRaw) ? requestedPriorityRaw : "P3 Low";
      const nextId = await getNextChgId();
      const triage = classifyReviewPath(normalizedType, title, details);
      const reviewStatus = "Human Review";
      const reviewReason = `Imported from help intake file (${sourceId}). ${triage.triageReason}`;
      const backlogStatus = "On Hold";
      const detailsWithSource = `${details} [Source: Help intake file ${sourceId}]`;
      const row = `| ${nextId} | ${normalizedType} | ${priority} | ${backlogStatus} | ${title} | ${detailsWithSource} | ${reviewStatus} | ${reviewReason} | - |`;
      await appendBacklogItem(row, todayIso);
      importedCount += 1;
    }

    res.status(201).json({ importedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import help intake requests";
    res.status(500).json({ error: message });
  }
});

export default router;
