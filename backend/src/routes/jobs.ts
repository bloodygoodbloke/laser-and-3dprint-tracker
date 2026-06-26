import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const jobs = await prisma.job.findMany({ include: { material: true } });
  res.json(jobs);
});

router.post("/", async (req, res) => {
  const { title, description, type, status, materialId, costCents, estimatedAt } = req.body;

  const job = await prisma.job.create({
    data: {
      title,
      description,
      type,
      status,
      materialId,
      costCents,
      estimatedAt: estimatedAt ? new Date(estimatedAt) : null,
    },
    include: { material: true },
  });

  res.status(201).json(job);
});

// Simple file upload/update endpoint (accepts filePath in JSON body)
router.post('/:id/upload', async (req, res) => {
  const { id } = req.params;
  const { filePath } = req.body;

  try {
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
    include: { material: true },
  });

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, type, status, materialId, costCents, estimatedAt } = req.body;

  try {
    const job = await prisma.job.update({
      where: { id },
      data: {
        title,
        description,
        type,
        status,
        materialId,
        costCents,
        estimatedAt: estimatedAt ? new Date(estimatedAt) : null,
      },
      include: { material: true },
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

// Calculate cost for a job and store result in JobCost (creates or updates)
router.post('/:id/calculate-cost', async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  // configurable rates via env with sensible defaults
  const KWH_RATE = parseFloat(process.env.KWH_RATE || '0.20');
  const LABOUR_RATE = parseFloat(process.env.LABOUR_RATE || '20');
  const OVERHEAD_PERCENT = parseFloat(process.env.OVERHEAD_PERCENT || '0.15');

  try {
    const job = await prisma.job.findUnique({ where: { id }, include: { material: true } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Determine calculation mode: '3d' or 'laser'
    const mode = payload.mode || '3d';

    let materialCost = 0;
    let electricityCost = 0;
    let labourCost = 0;

    if (mode === '3d') {
      const gramsUsed = Number(payload.gramsUsed || 0);
      const costPerGram = Number(payload.costPerGram ?? (job.material ? job.material.unitCostCents / 100 : 0));
      const printTimeMinutes = Number(payload.printTimeMinutes || 0);
      const printerWattage = Number(payload.printerWattage || process.env.PRINTER_WATTAGE || 120);

      materialCost = gramsUsed * costPerGram;
      electricityCost = (printTimeMinutes / 60) * KWH_RATE * (printerWattage / 1000);
      labourCost = (printTimeMinutes / 60) * LABOUR_RATE;
    } else if (mode === 'laser') {
      const areaUsed = Number(payload.areaUsed || 0);
      const costPerArea = Number(payload.costPerArea || 0);
      const sheetCost = Number(payload.sheetCost || 0);
      const laserMinutes = Number(payload.laserMinutes || 0);
      const laserWattage = Number(payload.laserWattage || process.env.LASER_WATTAGE || 40);

      materialCost = sheetCost > 0 ? sheetCost : areaUsed * costPerArea;
      electricityCost = (laserMinutes / 60) * (laserWattage / 1000) * KWH_RATE;
      labourCost = (laserMinutes / 60) * LABOUR_RATE;
    }

    const subtotal = materialCost + electricityCost + labourCost;
    const overheadCost = subtotal * OVERHEAD_PERCENT;
    const totalCost = subtotal + overheadCost;

    // persist JobCost (create or update)
    const existing = await prisma.jobCost.findUnique({ where: { jobId: id } });

    if (existing) {
      await prisma.jobCost.update({
        where: { jobId: id },
        data: {
          materialCost,
          electricityCost,
          labourCost,
          overheadCost,
          totalCost,
        },
      });
    } else {
      await prisma.jobCost.create({
        data: {
          jobId: id,
          materialCost,
          electricityCost,
          labourCost,
          overheadCost,
          totalCost,
        },
      });
    }

    // update job summary costCents
    await prisma.job.update({ where: { id }, data: { costCents: Math.round(totalCost * 100) } });

    res.json({ materialCost, electricityCost, labourCost, overheadCost, totalCost });
  } catch (error) {
    console.error('calculate-cost error', error);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

export default router;
