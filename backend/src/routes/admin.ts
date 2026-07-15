import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/backup", async (_req, res) => {
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

  res.json({ jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases, bambuDevices, bambuStatuses, bambuEvents, bambuSpools, bambuUsageLogs, bambuMaintenance, bambuFailureLogs });
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

  res.json({ jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases, bambuDevices, bambuStatuses, bambuEvents, bambuSpools, bambuUsageLogs, bambuMaintenance, bambuFailureLogs });
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

export default router;
