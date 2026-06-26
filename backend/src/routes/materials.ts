import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const materials = await prisma.material.findMany({ include: { jobs: true } });
  res.json(materials);
});

router.post("/", async (req, res) => {
  const { name, category, unitCostCents, quantity, unit } = req.body;

  const material = await prisma.material.create({
    data: {
      name,
      category,
      unitCostCents,
      quantity,
      unit,
    },
    include: { jobs: true },
  });

  res.status(201).json(material);
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
  const { name, category, unitCostCents, quantity, unit } = req.body;

  try {
    const material = await prisma.material.update({
      where: { id },
      data: {
        name,
        category,
        unitCostCents,
        quantity,
        unit,
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

export default router;
