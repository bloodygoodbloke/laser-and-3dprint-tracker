import { Router } from "express";
import prisma from "../prisma";

const router = Router();

const MAINTENANCE_COMPONENT_INTERVALS: Array<{ component: string; intervalHours: number }> = [
  { component: "Nozzle", intervalHours: 250 },
  { component: "Belts", intervalHours: 400 },
  { component: "Lubrication", intervalHours: 120 },
];

const resolveRiskLevel = (currentHours: number, intervalHours: number, recentErrorCount: number) => {
  if (intervalHours <= 0) return "Normal";
  const utilization = currentHours / intervalHours;
  if (utilization >= 1) return "Overdue";
  if (utilization >= 0.9 || recentErrorCount >= 5) return "High";
  if (utilization >= 0.75 || recentErrorCount >= 3) return "Watch";
  return "Normal";
};

const toDate = (value: unknown) => {
  if (!value) return new Date();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const resolveJobByPayload = async (payload: Record<string, unknown>) => {
  const jobId = String(payload.jobId || "").trim();
  const jobNumber = String(payload.jobNumber || "").trim();

  if (jobId) {
    return prisma.job.findUnique({ where: { id: jobId }, include: { materials: true } });
  }

  if (jobNumber) {
    return prisma.job.findUnique({ where: { jobNumber }, include: { materials: true } });
  }

  return null;
};

const upsertDevice = async (payload: Record<string, unknown>) => {
  const serial = String(payload.serial || "").trim();
  if (!serial) return null;
  const name = String(payload.name || serial).trim() || serial;
  const ipAddress = String(payload.ipAddress || "").trim();

  return prisma.bambuDevice.upsert({
    where: { serial },
    create: {
      serial,
      name,
      ipAddress,
      isOnline: true,
      lastSeenAt: new Date(),
    },
    update: {
      name,
      ipAddress,
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });
};

const updateMaintenancePredictions = async (deviceId: string) => {
  const [usage, recentErrors] = await Promise.all([
    prisma.bambuUsageLog.aggregate({
      where: { deviceId },
      _sum: { runtimeMinutes: true },
    }),
    prisma.bambuFailureLog.count({
      where: {
        deviceId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const currentHours = Number(usage._sum.runtimeMinutes || 0) / 60;

  for (const interval of MAINTENANCE_COMPONENT_INTERVALS) {
    const riskLevel = resolveRiskLevel(currentHours, interval.intervalHours, recentErrors);
    await prisma.bambuMaintenancePrediction.upsert({
      where: {
        deviceId_component: {
          deviceId,
          component: interval.component,
        },
      },
      create: {
        deviceId,
        component: interval.component,
        currentHours,
        intervalHours: interval.intervalHours,
        predictedDueHours: Math.max(0, interval.intervalHours - currentHours),
        riskLevel,
      },
      update: {
        currentHours,
        intervalHours: interval.intervalHours,
        predictedDueHours: Math.max(0, interval.intervalHours - currentHours),
        riskLevel,
      },
    });
  }
};

const updateJobStatusByEvent = async (jobId: string | null, eventType: string) => {
  if (!jobId) return;

  const normalized = eventType.toUpperCase();
  let nextStatus: string | null = null;

  if (normalized === "PRINT_STARTED") nextStatus = "In Progress";
  if (normalized === "PRINT_FINISHED") nextStatus = "Completed";
  if (normalized === "PRINT_FAILED") nextStatus = "Failed";
  if (normalized === "PRINT_CANCELLED") nextStatus = "Cancelled";

  if (!nextStatus) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: nextStatus },
  });
};

const applySpoolAdjustments = async (deviceId: string, adjustments: unknown) => {
  const list = Array.isArray(adjustments) ? adjustments : [];

  for (const raw of list) {
    const slotName = String((raw as Record<string, unknown>)?.slotName || "").trim();
    if (!slotName) continue;
    const gramsUsed = Number((raw as Record<string, unknown>)?.gramsUsed || 0);

    const existing = await prisma.bambuSpoolInventory.findUnique({
      where: { deviceId_slotName: { deviceId, slotName } },
    });

    if (!existing) continue;

    await prisma.bambuSpoolInventory.update({
      where: { deviceId_slotName: { deviceId, slotName } },
      data: {
        remainingGrams: Math.max(0, Number(existing.remainingGrams || 0) - Math.max(0, gramsUsed)),
      },
    });
  }
};

const deductMaterialStockFromJobUsage = async (jobId: string, materialGrams: number) => {
  if (materialGrams <= 0) return;

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { materials: true } });
  if (!job || !job.materials.length) return;

  const totalJobMaterialGrams = job.materials.reduce((sum, entry) => sum + Number(entry.usageQuantity || 0), 0);
  if (totalJobMaterialGrams <= 0) return;

  for (const entry of job.materials) {
    const share = Number(entry.usageQuantity || 0) / totalJobMaterialGrams;
    const deduction = materialGrams * share;

    await prisma.material.update({
      where: { id: entry.materialId },
      data: {
        stockLevel: {
          decrement: Math.max(0, deduction),
        },
      },
    });
  }
};

router.get("/dashboard", async (_req, res) => {
  const [devices, latestStatuses, openFailures, maintenance, events, spools] = await Promise.all([
    prisma.bambuDevice.findMany({ orderBy: { name: "asc" } }),
    prisma.bambuMachineStatus.findMany({
      orderBy: { reportedAt: "desc" },
      take: 25,
      include: { device: true, job: true },
    }),
    prisma.bambuFailureLog.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { device: true, job: true },
    }),
    prisma.bambuMaintenancePrediction.findMany({
      orderBy: [{ riskLevel: "desc" }, { component: "asc" }],
      include: { device: true },
    }),
    prisma.bambuEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { device: true, job: true },
    }),
    prisma.bambuSpoolInventory.findMany({
      orderBy: [{ deviceId: "asc" }, { slotName: "asc" }],
      include: { device: true },
    }),
  ]);

  res.json({
    devices,
    latestStatuses,
    openFailures,
    maintenance,
    events,
    spools,
  });
});

router.get("/status", async (_req, res) => {
  const statuses = await prisma.bambuMachineStatus.findMany({
    orderBy: { reportedAt: "desc" },
    take: 50,
    include: { device: true, job: true },
  });

  res.json(statuses);
});

router.post("/ingest/status", async (req, res) => {
  const payload = (req.body || {}) as Record<string, unknown>;
  const device = await upsertDevice(payload);

  if (!device) {
    return res.status(400).json({ error: "serial is required" });
  }

  const job = await resolveJobByPayload(payload);
  const amsSlots = Array.isArray(payload.amsSlots) ? payload.amsSlots : [];

  await prisma.bambuMachineStatus.create({
    data: {
      deviceId: device.id,
      jobId: job?.id,
      nozzleTempC: Number(payload.nozzleTempC || 0),
      bedTempC: Number(payload.bedTempC || 0),
      chamberTempC: Number(payload.chamberTempC || 0),
      progressPct: Number(payload.progressPct || 0),
      amsSummary: JSON.stringify(amsSlots),
      errorCode: String(payload.errorCode || ""),
      errorMessage: String(payload.errorMessage || ""),
      reportedAt: toDate(payload.reportedAt),
    },
  });

  for (const rawSlot of amsSlots as Array<Record<string, unknown>>) {
    const slotName = String(rawSlot.slotName || "").trim();
    if (!slotName) continue;

    await prisma.bambuSpoolInventory.upsert({
      where: {
        deviceId_slotName: {
          deviceId: device.id,
          slotName,
        },
      },
      create: {
        deviceId: device.id,
        slotName,
        materialName: String(rawSlot.materialName || ""),
        color: String(rawSlot.color || ""),
        remainingGrams: Number(rawSlot.remainingGrams || 0),
      },
      update: {
        materialName: String(rawSlot.materialName || ""),
        color: String(rawSlot.color || ""),
        remainingGrams: Number(rawSlot.remainingGrams || 0),
      },
    });
  }

  const errorCode = String(payload.errorCode || "").trim();
  const errorMessage = String(payload.errorMessage || "").trim();
  if (errorCode || errorMessage) {
    await prisma.bambuFailureLog.create({
      data: {
        deviceId: device.id,
        jobId: job?.id,
        errorCode,
        message: errorMessage || "Device reported an error state",
        severity: "Critical",
      },
    });
  }

  await updateMaintenancePredictions(device.id);

  res.status(201).json({ ingested: true, deviceId: device.id, jobId: job?.id || null });
});

router.post("/ingest/event", async (req, res) => {
  const payload = (req.body || {}) as Record<string, unknown>;
  const device = await upsertDevice(payload);

  if (!device) {
    return res.status(400).json({ error: "serial is required" });
  }

  const job = await resolveJobByPayload(payload);
  const eventType = String(payload.eventType || "UNKNOWN").trim() || "UNKNOWN";
  const runtimeMinutes = Number(payload.runtimeMinutes || 0);
  const materialGrams = Number(payload.materialGrams || 0);

  await prisma.bambuEvent.create({
    data: {
      deviceId: device.id,
      jobId: job?.id,
      eventType,
      payload: JSON.stringify(payload.payload || payload),
      createdAt: toDate(payload.createdAt),
    },
  });

  await updateJobStatusByEvent(job?.id || null, eventType);

  if (runtimeMinutes > 0 || materialGrams > 0) {
    await prisma.bambuUsageLog.create({
      data: {
        deviceId: device.id,
        jobId: job?.id,
        runtimeMinutes: Math.max(0, runtimeMinutes),
        materialGrams: Math.max(0, materialGrams),
        source: String(payload.source || "event"),
      },
    });
  }

  if (job?.id && runtimeMinutes > 0) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        machineRunTimeMinutes: Math.max(0, runtimeMinutes),
      },
    });
  }

  if (job?.id && materialGrams > 0) {
    await deductMaterialStockFromJobUsage(job.id, materialGrams);
  }

  if (String(eventType).toUpperCase() === "PRINT_FAILED") {
    await prisma.bambuFailureLog.create({
      data: {
        deviceId: device.id,
        jobId: job?.id,
        errorCode: String(payload.errorCode || "PRINT_FAILED"),
        message: String(payload.message || "Print failed event received from Bambu telemetry"),
        severity: "Critical",
      },
    });
  }

  await applySpoolAdjustments(device.id, payload.spoolAdjustments);
  await updateMaintenancePredictions(device.id);

  res.status(201).json({ ingested: true, deviceId: device.id, jobId: job?.id || null, eventType });
});

router.post("/simulate/tick", async (req, res) => {
  const payload = (req.body || {}) as Record<string, unknown>;
  const serial = String(payload.serial || "BAMBU-SIM-001");
  const progressPct = Number(payload.progressPct || Math.floor(Math.random() * 100));
  const nozzleTempC = Number(payload.nozzleTempC || 215 + Math.floor(Math.random() * 6));
  const bedTempC = Number(payload.bedTempC || 55 + Math.floor(Math.random() * 4));
  const chamberTempC = Number(payload.chamberTempC || 35 + Math.floor(Math.random() * 6));

  const device = await upsertDevice({
    serial,
    name: String(payload.name || "BambuLab P1S (Sim)"),
    ipAddress: String(payload.ipAddress || "192.168.0.50"),
  });

  if (!device) {
    return res.status(400).json({ error: "Could not create simulated device" });
  }

  const amsSlots = [
    { slotName: "A1", materialName: "PLA", color: "White", remainingGrams: Math.max(0, 1000 - progressPct * 3) },
    { slotName: "A2", materialName: "PLA", color: "Black", remainingGrams: Math.max(0, 1000 - progressPct * 2.5) },
  ];

  await prisma.bambuMachineStatus.create({
    data: {
      deviceId: device.id,
      nozzleTempC,
      bedTempC,
      chamberTempC,
      progressPct,
      amsSummary: JSON.stringify(amsSlots),
    },
  });

  for (const slot of amsSlots) {
    await prisma.bambuSpoolInventory.upsert({
      where: { deviceId_slotName: { deviceId: device.id, slotName: slot.slotName } },
      create: {
        deviceId: device.id,
        slotName: slot.slotName,
        materialName: slot.materialName,
        color: slot.color,
        remainingGrams: slot.remainingGrams,
      },
      update: {
        materialName: slot.materialName,
        color: slot.color,
        remainingGrams: slot.remainingGrams,
      },
    });
  }

  await updateMaintenancePredictions(device.id);
  res.status(201).json({ simulated: true, deviceId: device.id, progressPct });
});

export default router;
