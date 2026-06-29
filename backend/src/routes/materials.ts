import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const materials = await prisma.material.findMany({ include: { jobs: true } });
  res.json(materials);
});

router.post("/", async (req, res) => {
  const { name, type, unit, color, costPerUnit, stockLevel, reorderThreshold } = req.body;

  const material = await prisma.material.create({
    data: {
      name,
      type,
      unit,
      color: color || "",
      costPerUnit: Number(costPerUnit || 0),
      stockLevel: Number(stockLevel || 0),
      reorderThreshold: Number(reorderThreshold || 0),
    },
    include: { jobs: true },
  });

  res.status(201).json(material);
});

router.post("/import-csv", async (req, res) => {
  const payload = req.body || {};
  const importedMaterials = Array.isArray(payload.materials) ? payload.materials : [];

  let created = 0;
  let updated = 0;

  for (const rawMaterial of importedMaterials) {
    const name = String(rawMaterial?.name || "").trim();
    if (!name) continue;

    const type = String(rawMaterial?.type || "Other").trim() || "Other";
    const unit = String(rawMaterial?.unit || "g").trim() || "g";
    const color = String(rawMaterial?.color || "").trim();
    const costPerUnit = Number(rawMaterial?.costPerUnit || 0);
    const stockLevel = Number(rawMaterial?.stockLevel || 0);
    const reorderThreshold = Number(rawMaterial?.reorderThreshold || 0);

    const existing = await prisma.material.findFirst({
      where: { name, type, unit, color },
    });

    if (existing) {
      await prisma.material.update({
        where: { id: existing.id },
        data: { costPerUnit, stockLevel, reorderThreshold },
      });
      updated += 1;
      continue;
    }

    await prisma.material.create({
      data: {
        name,
        type,
        unit,
        color,
        costPerUnit,
        stockLevel,
        reorderThreshold,
      },
    });
    created += 1;
  }

  res.json({ imported: importedMaterials.length, created, updated });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const material = await prisma.material.findUnique({
    where: { id },
    include: { jobs: true },
  });

  if (!material) {
    return res.status(404).json({ error: "Material not found" });
  }

  res.json(material);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, type, unit, color, costPerUnit, stockLevel, reorderThreshold } = req.body;

  try {
    const material = await prisma.material.update({
      where: { id },
      data: {
        name,
        type,
        unit,
        color: color || "",
        costPerUnit: Number(costPerUnit || 0),
        stockLevel: Number(stockLevel || 0),
        reorderThreshold: Number(reorderThreshold || 0),
      },
      include: { jobs: true },
    });

    res.json(material);
  } catch (error) {
    res.status(404).json({ error: "Material not found" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.material.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: "Material not found" });
  }
});

router.post("/backup", async (req, res) => {
  const { jobs = [], materials = [] } = req.body || {};

  await prisma.job.deleteMany();
  await prisma.material.deleteMany();

  for (const material of materials) {
    await prisma.material.create({
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
    await prisma.job.create({
      data: {
        jobNumber: job.jobNumber || `JOB-${String((jobs as Array<any>).indexOf(job) + 1).padStart(4, "0")}`,
        name: job.name,
        customer: job.customer,
        machineType: job.machineType,
        estTimeMinutes: Number(job.estTimeMinutes || 0),
        status: job.status,
      },
    });
  }

  res.json({ restored: true });
});

router.post("/seed", async (_req, res) => {
  const starterMaterials = [
    { name: "PLA", type: "Filament", unit: "g", color: "Red", costPerUnit: 0.025, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PLA", type: "Filament", unit: "g", color: "Blue", costPerUnit: 0.025, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PLA", type: "Filament", unit: "g", color: "White", costPerUnit: 0.025, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PLA", type: "Filament", unit: "g", color: "Black", costPerUnit: 0.025, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PETG", type: "Filament", unit: "g", color: "Red", costPerUnit: 0.03, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PETG", type: "Filament", unit: "g", color: "Blue", costPerUnit: 0.03, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PETG", type: "Filament", unit: "g", color: "White", costPerUnit: 0.03, stockLevel: 1000, reorderThreshold: 200 },
    { name: "PETG", type: "Filament", unit: "g", color: "Black", costPerUnit: 0.03, stockLevel: 1000, reorderThreshold: 200 },
  ];

  await prisma.material.deleteMany();
  const created = await Promise.all(starterMaterials.map((material) => prisma.material.create({ data: material })));

  res.json({ created: created.length });
});

export default router;
