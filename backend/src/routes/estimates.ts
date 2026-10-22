import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/templates", async (_req, res) => {
  const templates = await prisma.estimateTemplate.findMany({
    orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }],
  });
  res.json(templates);
});

router.post("/templates", async (req, res) => {
  const payload = req.body || {};
  const created = await prisma.estimateTemplate.create({
    data: {
      name: String(payload.name || "").trim() || "Untitled estimate",
      sourceUrl: String(payload.sourceUrl || ""),
      machineType: String(payload.machineType || "Other"),
      machineRunTimeMinutes: Number(payload.machineRunTimeMinutes || 0),
      setupTimeMinutes: Number(payload.setupTimeMinutes || 0),
      postProcessingMinutes: Number(payload.postProcessingMinutes || 0),
      labourTimeMinutes: Number(payload.labourTimeMinutes || 0),
      suggestedMaterialGrams: Number(payload.suggestedMaterialGrams || 0),
      notes: String(payload.notes || ""),
      lastEstimatedBaseCost: Number(payload.lastEstimatedBaseCost || 0),
      lastEstimatedCharge: Number(payload.lastEstimatedCharge || 0),
      lastUsedAt: payload.lastUsedAt ? new Date(String(payload.lastUsedAt)) : null,
    },
  });

  res.status(201).json(created);
});

router.put("/templates/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  try {
    const updated = await prisma.estimateTemplate.update({
      where: { id },
      data: {
        name: payload.name !== undefined ? String(payload.name || "").trim() || "Untitled estimate" : undefined,
        sourceUrl: payload.sourceUrl !== undefined ? String(payload.sourceUrl || "") : undefined,
        machineType: payload.machineType !== undefined ? String(payload.machineType || "Other") : undefined,
        machineRunTimeMinutes: payload.machineRunTimeMinutes !== undefined ? Number(payload.machineRunTimeMinutes || 0) : undefined,
        setupTimeMinutes: payload.setupTimeMinutes !== undefined ? Number(payload.setupTimeMinutes || 0) : undefined,
        postProcessingMinutes: payload.postProcessingMinutes !== undefined ? Number(payload.postProcessingMinutes || 0) : undefined,
        labourTimeMinutes: payload.labourTimeMinutes !== undefined ? Number(payload.labourTimeMinutes || 0) : undefined,
        suggestedMaterialGrams: payload.suggestedMaterialGrams !== undefined ? Number(payload.suggestedMaterialGrams || 0) : undefined,
        notes: payload.notes !== undefined ? String(payload.notes || "") : undefined,
        lastEstimatedBaseCost: payload.lastEstimatedBaseCost !== undefined ? Number(payload.lastEstimatedBaseCost || 0) : undefined,
        lastEstimatedCharge: payload.lastEstimatedCharge !== undefined ? Number(payload.lastEstimatedCharge || 0) : undefined,
        lastUsedAt: payload.markUsed ? new Date() : undefined,
      },
    });

    res.json(updated);
  } catch (_error) {
    res.status(404).json({ error: "Estimate template not found" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.estimateTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (_error) {
    res.status(404).json({ error: "Estimate template not found" });
  }
});

export default router;
