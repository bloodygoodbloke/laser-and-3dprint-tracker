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

export default router;
