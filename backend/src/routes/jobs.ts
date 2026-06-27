import { Router } from "express";
import prisma from "../prisma";
import { upload } from "../upload";

const router = Router();

router.get("/", async (_req, res) => {
  const jobs = await prisma.job.findMany({ include: { materials: { include: { material: true } }, cost: true } });
  res.json(jobs);
});

router.post("/", async (req, res) => {
  const { name, customer, machineType, estTimeMinutes, machineRunTimeMinutes, labourTimeMinutes, status, jobNumber, materials = [] } = req.body;

  const jobsCount = await prisma.job.count();
  const generatedNumber = jobNumber || `JOB-${String(jobsCount + 1).padStart(4, "0")}`;

  const job = await prisma.job.create({
    data: {
      jobNumber: generatedNumber,
      name,
      customer,
      machineType,
      estTimeMinutes: Number(estTimeMinutes || 0),
      machineRunTimeMinutes: Number(machineRunTimeMinutes ?? estTimeMinutes ?? 0),
      labourTimeMinutes: Number(labourTimeMinutes ?? estTimeMinutes ?? 0),
      status: status || "Pending",
      materials: {
        create: materials.map((entry: any) => ({
          materialId: entry.materialId,
          usageQuantity: Number(entry.usageQuantity || 0),
          usageUnit: entry.usageUnit || "g",
          usageUnitCost: Number(entry.usageUnitCost || 0),
        })),
      },
    },
    include: { materials: { include: { material: true } }, cost: true },
  });

  res.status(201).json(job);
});

router.post('/:id/upload', upload.single('file'), async (req, res) => {
  const { id } = req.params;

  try {
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    const job = await prisma.job.update({ where: { id }, data: { filePath } });
    res.json(job);
  } catch (error) {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { materials: { include: { material: true } }, cost: true },
  });

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, customer, machineType, estTimeMinutes, machineRunTimeMinutes, labourTimeMinutes, status, jobNumber, materials = [] } = req.body;

  try {
    await prisma.jobMaterial.deleteMany({ where: { jobId: id } });

    const job = await prisma.job.update({
      where: { id },
      data: {
        jobNumber: jobNumber || undefined,
        name,
        customer,
        machineType,
        estTimeMinutes: Number(estTimeMinutes || 0),
        machineRunTimeMinutes: Number(machineRunTimeMinutes ?? estTimeMinutes ?? 0),
        labourTimeMinutes: Number(labourTimeMinutes ?? estTimeMinutes ?? 0),
        status,
        materials: {
          create: materials.map((entry: any) => ({
            materialId: entry.materialId,
            usageQuantity: Number(entry.usageQuantity || 0),
            usageUnit: entry.usageUnit || "g",
            usageUnitCost: Number(entry.usageUnitCost || 0),
          })),
        },
      },
      include: { materials: { include: { material: true } }, cost: true },
    });

    res.json(job);
  } catch (error) {
    res.status(404).json({ error: "Job not found" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.job.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: "Job not found" });
  }
});

router.post('/:id/calculate-cost', async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  const billingSettings = await prisma.billingSetting.findMany();
  const settings = billingSettings[0];
  const KWH_RATE = settings?.electricityCostPerKwh ?? parseFloat(process.env.KWH_RATE || '0.20');
  const LABOUR_RATE = settings?.labourRate ?? parseFloat(process.env.LABOUR_RATE || '20');
  const WORKSHOP_HOURLY_RATE = settings?.workshopHourlyRate ?? 0;
  const MATERIAL_MARKUP_PERCENT = Number(settings?.materialMarkupPercent) > 0 ? Number(settings?.materialMarkupPercent) : 25;
  const ELECTRICITY_MARKUP_PERCENT = Number(settings?.electricityMarkupPercent) > 0 ? Number(settings?.electricityMarkupPercent) : 25;
  const DEPRECIATION_COST = settings?.depreciationCost ?? 0;
  const DEPRECIATION_HOURS = settings?.depreciationHours ?? 0;

  try {
    const job = await prisma.job.findUnique({ where: { id }, include: { materials: { include: { material: true } } } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const mode = payload.mode || '3d';
    const machineName = String(payload.machineName || job.machineType || 'Other');
    const machineSettings = settings?.machineElectricitySettings ? JSON.parse(String(settings.machineElectricitySettings || '{}')) : {};
    const selectedMachine = machineSettings[machineName] || {};
    const machineWattage = Number(selectedMachine?.wattage ?? payload.wattage ?? process.env.PRINTER_WATTAGE ?? (mode === 'laser' ? process.env.LASER_WATTAGE : process.env.PRINTER_WATTAGE) ?? 120);
    const machineDepreciationCost = Number(selectedMachine?.depreciationCost ?? DEPRECIATION_COST ?? 0);
    const machineReplacementRunHours = Number(selectedMachine?.replacementRunHours ?? DEPRECIATION_HOURS ?? 0);
    const materialTypeMarkups = settings?.materialTypeMarkups ? JSON.parse(String(settings.materialTypeMarkups || '{}')) : {};
    const materialTypeById = new Map(job.materials.map((entry) => [entry.materialId, entry.material?.type || 'Other']));

    let materialCost = 0;
    let electricityCost = 0;
    let labourCost = 0;

    const machineRunTimeMinutes = Number(payload.machineRunTimeMinutes ?? payload.printTimeMinutes ?? payload.laserMinutes ?? job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 0);
    const labourTimeMinutes = Number(payload.labourTimeMinutes ?? job.labourTimeMinutes ?? machineRunTimeMinutes);
    const depreciationCost = machineReplacementRunHours > 0 ? (machineRunTimeMinutes / 60) * (machineDepreciationCost / machineReplacementRunHours) : 0;
    let materialTypeMarkupCharge = 0;

    if (mode === '3d') {
      const materialEntries = Array.isArray(payload.materials) ? payload.materials : [];

      if (materialEntries.length) {
        materialCost = materialEntries.reduce((sum: number, entry: any) => sum + (Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0)), 0);
        materialTypeMarkupCharge = materialEntries.reduce((sum: number, entry: any) => {
          const materialType = String(entry?.material?.type || entry?.type || materialTypeById.get(String(entry.materialId || '')) || 'Other');
          const typeRule = materialTypeMarkups[materialType] || { percent: 25 };
          const lineBase = Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0);
          const typeMarkupPercent = Number(typeRule.percent) > 0 ? Number(typeRule.percent) : 25;
          return sum + (lineBase * (typeMarkupPercent / 100));
        }, 0);
      } else {
        const gramsUsed = Number(payload.gramsUsed || 0);
        const costPerGram = Number(payload.costPerGram ?? (job.materials[0]?.material?.costPerUnit || 0));
        materialCost = gramsUsed * costPerGram;
      }
      electricityCost = ((machineRunTimeMinutes / 60) * KWH_RATE * (machineWattage / 1000)) + depreciationCost;
      labourCost = (labourTimeMinutes / 60) * LABOUR_RATE;
    } else if (mode === 'laser') {
      const materialEntries = Array.isArray(payload.materials) ? payload.materials : [];

      if (materialEntries.length) {
        materialCost = materialEntries.reduce((sum: number, entry: any) => sum + (Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0)), 0);
        materialTypeMarkupCharge = materialEntries.reduce((sum: number, entry: any) => {
          const materialType = String(entry?.material?.type || entry?.type || materialTypeById.get(String(entry.materialId || '')) || 'Other');
          const typeRule = materialTypeMarkups[materialType] || { percent: 25 };
          const lineBase = Number(entry.usageQuantity || 0) * Number(entry.usageUnitCost || 0);
          const typeMarkupPercent = Number(typeRule.percent) > 0 ? Number(typeRule.percent) : 25;
          return sum + (lineBase * (typeMarkupPercent / 100));
        }, 0);
      } else {
        const areaUsed = Number(payload.areaUsed || 0);
        const costPerArea = Number(payload.costPerArea || 0);
        const sheetCost = Number(payload.sheetCost || 0);
        materialCost = sheetCost > 0 ? sheetCost : areaUsed * costPerArea;
      }
      electricityCost = ((machineRunTimeMinutes / 60) * (machineWattage / 1000) * KWH_RATE) + depreciationCost;
      labourCost = (labourTimeMinutes / 60) * LABOUR_RATE;
    }

    const subtotal = materialCost + electricityCost + labourCost;
    const overheadCost = (machineRunTimeMinutes / 60) * WORKSHOP_HOURLY_RATE;
    const totalCost = subtotal + overheadCost;

    const materialCharge = materialCost + materialTypeMarkupCharge + (materialCost * (MATERIAL_MARKUP_PERCENT / 100));
    const electricityCharge = electricityCost + (electricityCost * (ELECTRICITY_MARKUP_PERCENT / 100));
    const labourCharge = labourCost;
    const overheadCharge = overheadCost;
    const customerCharge = materialCharge + electricityCharge + labourCharge + overheadCharge;

    const existing = await prisma.jobCost.findUnique({ where: { jobId: id } });

    if (existing) {
      await prisma.jobCost.update({
        where: { jobId: id },
        data: { materialCost, electricityCost, labourCost, overheadCost, totalCost, customerCharge },
      });
    } else {
      await prisma.jobCost.create({
        data: { jobId: id, materialCost, electricityCost, labourCost, overheadCost, totalCost, customerCharge },
      });
    }

    res.json({ materialCost, electricityCost, labourCost, overheadCost, totalCost, customerCharge });
  } catch (error) {
    console.error('calculate-cost error', error);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

export default router;
