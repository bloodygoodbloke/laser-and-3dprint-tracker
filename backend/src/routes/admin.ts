import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/backup", async (_req, res) => {
  const [jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases] = await Promise.all([
    prisma.job.findMany({ include: { materials: { include: { material: true } }, cost: true } }),
    prisma.material.findMany(),
    prisma.billingSetting.findMany(),
    prisma.jobCost.findMany(),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.materialPurchase.findMany(),
  ]);

  res.json({ jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases });
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
  const [jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases] = await Promise.all([
    prisma.job.findMany({ include: { materials: { include: { material: true } }, cost: true } }),
    prisma.material.findMany(),
    prisma.billingSetting.findMany(),
    prisma.jobCost.findMany(),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.materialPurchase.findMany(),
  ]);

  res.json({ jobs, materials, billingSettings, jobCosts, customers, suppliers, purchases });
});

router.post("/backup/full", async (req, res) => {
  const { jobs = [], materials = [], billingSettings = [], jobCosts = [], customers = [], suppliers = [], purchases = [] } = req.body || {};

  await prisma.$transaction(async (tx) => {
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
  });

  res.json({ restored: true, jobsCount: jobs.length, materialsCount: materials.length, billingSettingsCount: Array.isArray(billingSettings) ? billingSettings.length : billingSettings ? 1 : 0, customersCount: customers.length, suppliersCount: suppliers.length, purchasesCount: purchases.length });
});

export default router;
