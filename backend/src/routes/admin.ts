import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

const BACKUP_SCHEMA_VERSION = "2026-07-24";

type RawRecord = Record<string, unknown>;

const toRecordArray = (value: unknown): RawRecord[] => Array.isArray(value)
  ? value.filter((item): item is RawRecord => Boolean(item) && typeof item === "object")
  : [];

const parseJsonRecord = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch (_error) {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

const isBillingSchemaCompatibilityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("BillingSetting") && (
    message.includes("does not exist")
    || message.includes("Unknown arg")
    || message.includes("Unknown argument")
    || message.includes("has no column")
  );
};

const isPrismaClientSchemaDriftError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("Unknown argument") || message.includes("Unknown arg");
};

const hasBillingBackupSchemaSupport = async () => {
  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info('BillingSetting')");
    const columnSet = new Set(columns.map((column) => String(column.name || "")).filter(Boolean));
    return columnSet.has("adminBackgroundColor")
      && columnSet.has("siteInputColor")
      && columnSet.has("siteAccentColor")
      && columnSet.has("siteAccentTextColor");
  } catch (_error) {
    return false;
  }
};

const getFullBackupPayload = async (includeBillingSettings = true) => {
  const [jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases, estimateTemplates, billingAuditLogs, bambuDevices, bambuStatuses, bambuEvents, bambuSpools, bambuUsageLogs, bambuMaintenance, bambuFailureLogs] = await Promise.all([
    prisma.job.findMany({ include: { materials: { include: { material: true } }, cost: true } }),
    prisma.material.findMany(),
    includeBillingSettings ? prisma.billingSetting.findMany() : Promise.resolve([]),
    prisma.jobCost.findMany(),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.materialPurchase.findMany(),
    prisma.estimateTemplate.findMany(),
    prisma.billingAuditLog.findMany(),
    prisma.bambuDevice.findMany(),
    prisma.bambuMachineStatus.findMany(),
    prisma.bambuEvent.findMany(),
    prisma.bambuSpoolInventory.findMany(),
    prisma.bambuUsageLog.findMany(),
    prisma.bambuMaintenancePrediction.findMany(),
    prisma.bambuFailureLog.findMany(),
  ]);

  const normalizedBillingSettings = billingSettings.map((setting) => ({
    ...setting,
    machineElectricitySettings: parseJsonRecord(setting.machineElectricitySettings),
    materialTypeMarkups: parseJsonRecord(setting.materialTypeMarkups),
  }));

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
      "estimate templates",
      "billing audit logs",
      "machine profile settings",
      "bambu devices",
      "bambu statuses",
      "bambu events",
      "bambu spool inventory",
      "bambu usage logs",
      "bambu maintenance predictions",
      "bambu failure logs",
      "reports (derived from jobs, costs, customers, and materials)",
      ...(includeBillingSettings ? ["billing settings", "theme colors"] : []),
    ],
    jobs,
    materials,
    billingSettings: normalizedBillingSettings,
    jobCosts,
    customers,
    suppliers,
    purchases,
    estimateTemplates,
    billingAuditLogs,
    bambuDevices,
    bambuStatuses,
    bambuEvents,
    bambuSpools,
    bambuUsageLogs,
    bambuMaintenance,
    bambuFailureLogs,
  };
};

router.get("/backup", async (_req, res) => {
  try {
    const includeBillingSettings = await hasBillingBackupSchemaSupport();
    const payload = await getFullBackupPayload(includeBillingSettings);
    if (!includeBillingSettings) {
      return res.json({
        ...payload,
        warnings: ["Billing settings were omitted because the local database schema is behind current billing columns. Run Prisma migrations to include billing/theme settings in full backups."],
      });
    }
    return res.json(payload);
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.status(503).json({ error: "Billing settings schema is behind expected version. Run migrations before exporting full backup." });
    }
    const message = error instanceof Error ? error.message : "Failed to export backup";
    return res.status(500).json({ error: message });
  }
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
          setupTimeMinutes: Number(job.setupTimeMinutes ?? 0),
          postProcessingMinutes: Number(job.postProcessingMinutes ?? 0),
          labourTimeMinutes: Number(job.labourTimeMinutes ?? (Number(job.setupTimeMinutes ?? 0) + Number(job.postProcessingMinutes ?? 0))),
          dueDate: job.dueDate ? new Date(String(job.dueDate)) : null,
          queuePosition: Number(job.queuePosition || 0),
          qaChecklist: JSON.stringify(Array.isArray(job.qaChecklist) ? job.qaChecklist : []),
          qaPassed: Boolean(job.qaPassed),
          reworkCost: Number(job.reworkCost || 0),
          reworkNotes: String(job.reworkNotes || ""),
          setupFee: Math.max(0, Number(job.setupFee || 0)),
          deliveryCharge: Math.max(0, Number(job.deliveryCharge || 0)),
          failureReason: String(job.failureReason || ""),
          failureWasteGrams: Number(job.failureWasteGrams || 0),
          failureCost: Number(job.failureCost || 0),
          isRush: Boolean(job.isRush),
          isSetupFee: Boolean(job.isSetupFee),
          isDelivery: Boolean(job.isDelivery),
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
  try {
    const includeBillingSettings = await hasBillingBackupSchemaSupport();
    const payload = await getFullBackupPayload(includeBillingSettings);
    if (!includeBillingSettings) {
      return res.json({
        ...payload,
        warnings: ["Billing settings were omitted because the local database schema is behind current billing columns. Run Prisma migrations to include billing/theme settings in full backups."],
      });
    }
    return res.json(payload);
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.status(503).json({ error: "Billing settings schema is behind expected version. Run migrations before exporting full backup." });
    }
    const message = error instanceof Error ? error.message : "Failed to export full backup";
    return res.status(500).json({ error: message });
  }
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
          websiteUrl: String(supplier.websiteUrl || "").trim(),
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

router.get("/backup/billing", async (_req, res) => {
  try {
    const billingSetting = await prisma.billingSetting.findFirst();

    if (!billingSetting) {
      return res.json({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        billingSettings: null,
      });
    }

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = billingSetting as unknown as Record<string, unknown>;
    return res.json({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      billingSettings: {
        ...rest,
        machineElectricitySettings: parseJsonRecord(rest.machineElectricitySettings),
        materialTypeMarkups: parseJsonRecord(rest.materialTypeMarkups),
      },
    });
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.status(503).json({ error: "Billing settings schema is behind expected version. Run migrations before exporting billing backup." });
    }
    const message = error instanceof Error ? error.message : "Failed to export billing backup";
    return res.status(500).json({ error: message });
  }
});

router.post("/backup/billing", async (req, res) => {
  try {
    const payload = (req.body?.billingSettings && typeof req.body.billingSettings === "object")
      ? req.body.billingSettings as RawRecord
      : (req.body || {}) as RawRecord;

    if (!payload || typeof payload !== "object" || !Object.keys(payload).length) {
      return res.status(400).json({ error: "billingSettings payload is required" });
    }

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...safePayload } = payload;
    const normalizedPayload = {
      ...safePayload,
      machineElectricitySettings: JSON.stringify(parseJsonRecord(safePayload.machineElectricitySettings)),
      materialTypeMarkups: JSON.stringify(parseJsonRecord(safePayload.materialTypeMarkups)),
    };

    const existing = await prisma.billingSetting.findFirst();
    const saved = existing
      ? await prisma.billingSetting.update({ where: { id: existing.id }, data: normalizedPayload })
      : await prisma.billingSetting.create({ data: normalizedPayload as any });

    const { id: _savedId, createdAt: _savedCreatedAt, updatedAt: _savedUpdatedAt, ...rest } = saved as unknown as Record<string, unknown>;
    return res.json({
      restored: true,
      billingSettings: {
        ...rest,
        machineElectricitySettings: parseJsonRecord(rest.machineElectricitySettings),
        materialTypeMarkups: parseJsonRecord(rest.materialTypeMarkups),
      },
    });
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.status(503).json({ error: "Billing settings schema is behind expected version. Run migrations before restoring billing backup." });
    }
    const message = error instanceof Error ? error.message : "Failed to restore billing backup";
    return res.status(500).json({ error: message });
  }
});

router.post("/backup/full", async (req, res) => {
  const { jobs = [], materials = [], billingSettings = [], jobCosts = [], customers = [], suppliers = [], purchases = [], estimateTemplates = [], billingAuditLogs = [], bambuDevices = [], bambuStatuses = [], bambuEvents = [], bambuSpools = [], bambuUsageLogs = [], bambuMaintenance = [], bambuFailureLogs = [] } = req.body || {};

  try {
    const includeBillingSettings = await hasBillingBackupSchemaSupport();

    await prisma.$transaction(async (tx) => {
    await tx.bambuFailureLog.deleteMany();
    await tx.bambuMaintenancePrediction.deleteMany();
    await tx.bambuUsageLog.deleteMany();
    await tx.bambuSpoolInventory.deleteMany();
    await tx.bambuEvent.deleteMany();
    await tx.bambuMachineStatus.deleteMany();
    await tx.bambuDevice.deleteMany();
    await tx.jobCost.deleteMany();
    await tx.billingAuditLog.deleteMany();
    await tx.estimateTemplate.deleteMany();
    await tx.job.deleteMany();
    await tx.material.deleteMany();
    await tx.customer.deleteMany();
    await tx.materialPurchase.deleteMany();
    await tx.supplier.deleteMany();
    if (includeBillingSettings) {
      await tx.billingSetting.deleteMany();
    }

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
    if (includeBillingSettings && billingSettingPayload) {
      await tx.billingSetting.create({
        data: {
          ...billingSettingPayload,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          machineElectricitySettings: JSON.stringify(parseJsonRecord(billingSettingPayload.machineElectricitySettings)),
          materialTypeMarkups: JSON.stringify(parseJsonRecord(billingSettingPayload.materialTypeMarkups)),
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
          websiteUrl: String(supplier.websiteUrl || "").trim(),
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
          setupTimeMinutes: Number(job.setupTimeMinutes ?? 0),
          postProcessingMinutes: Number(job.postProcessingMinutes ?? 0),
          labourTimeMinutes: Number(job.labourTimeMinutes ?? (Number(job.setupTimeMinutes ?? 0) + Number(job.postProcessingMinutes ?? 0))),
          dueDate: job.dueDate ? new Date(String(job.dueDate)) : null,
          queuePosition: Number(job.queuePosition || 0),
          qaChecklist: JSON.stringify(Array.isArray(job.qaChecklist) ? job.qaChecklist : []),
          qaPassed: Boolean(job.qaPassed),
          reworkCost: Number(job.reworkCost || 0),
          reworkNotes: String(job.reworkNotes || ""),
          setupFee: Math.max(0, Number(job.setupFee || 0)),
          deliveryCharge: Math.max(0, Number(job.deliveryCharge || 0)),
          failureReason: String(job.failureReason || ""),
          failureWasteGrams: Number(job.failureWasteGrams || 0),
          failureCost: Number(job.failureCost || 0),
          isRush: Boolean(job.isRush),
          isSetupFee: Boolean(job.isSetupFee),
          isDelivery: Boolean(job.isDelivery),
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

    return res.json({
      restored: true,
      jobsCount: jobs.length,
      materialsCount: materials.length,
      billingSettingsCount: includeBillingSettings ? (Array.isArray(billingSettings) ? billingSettings.length : billingSettings ? 1 : 0) : 0,
      billingSettingsRestored: includeBillingSettings,
      warning: includeBillingSettings
        ? null
        : "Billing settings were skipped because the local database schema is behind current billing columns. Run Prisma migrations, then restore billing/full backup again.",
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      purchasesCount: purchases.length,
      bambuDevicesCount: bambuDevices.length,
      bambuStatusesCount: bambuStatuses.length,
      bambuEventsCount: bambuEvents.length,
      bambuSpoolsCount: bambuSpools.length,
      bambuUsageLogsCount: bambuUsageLogs.length,
      bambuMaintenanceCount: bambuMaintenance.length,
      bambuFailureLogsCount: bambuFailureLogs.length,
    });
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.status(503).json({ error: "Billing settings schema is behind expected version. Run migrations before restoring full backup billing settings." });
    }
    if (isPrismaClientSchemaDriftError(error)) {
      return res.status(503).json({ error: "Prisma client/schema mismatch detected. Run backend Prisma migrate + generate, restart backend, then retry full restore." });
    }
    const message = error instanceof Error ? error.message : "Failed to restore full backup";
    return res.status(500).json({ error: message });
  }
});

export default router;
