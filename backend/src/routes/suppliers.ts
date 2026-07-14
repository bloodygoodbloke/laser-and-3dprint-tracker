import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ include: { purchases: true } });
  res.json(suppliers);
});

router.post("/", async (req, res) => {
  const { name, contactEmail, contactPhone, notes } = req.body || {};

  const supplier = await prisma.supplier.create({
    data: {
      name: String(name || "").trim(),
      contactEmail: String(contactEmail || "").trim(),
      contactPhone: String(contactPhone || "").trim(),
      notes: String(notes || "").trim(),
    },
    include: { purchases: true },
  });

  res.status(201).json(supplier);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, contactEmail, contactPhone, notes } = req.body || {};

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: String(name || "").trim(),
        contactEmail: String(contactEmail || "").trim(),
        contactPhone: String(contactPhone || "").trim(),
        notes: String(notes || "").trim(),
      },
      include: { purchases: true },
    });

    res.json(supplier);
  } catch (_error) {
    res.status(404).json({ error: "Supplier not found" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.materialPurchase.deleteMany({ where: { supplierId: id } });
      await tx.supplier.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (_error) {
    res.status(404).json({ error: "Supplier not found" });
  }
});

router.get("/:id/purchases", async (req, res) => {
  const { id } = req.params;
  const purchases = await prisma.materialPurchase.findMany({
    where: { supplierId: id },
    orderBy: { purchasedAt: "desc" },
  });
  res.json(purchases);
});

router.post("/:id/purchases", async (req, res) => {
  const { id } = req.params;
  const { materialName, quantityKg, totalCost, purchasedAt, notes } = req.body || {};

  try {
    const purchase = await prisma.materialPurchase.create({
      data: {
        supplierId: id,
        materialName: String(materialName || "").trim(),
        quantityKg: Number(quantityKg || 0),
        totalCost: Number(totalCost || 0),
        purchasedAt: purchasedAt ? new Date(String(purchasedAt)) : new Date(),
        notes: String(notes || "").trim(),
      },
    });

    res.status(201).json(purchase);
  } catch (_error) {
    res.status(404).json({ error: "Supplier not found" });
  }
});

export default router;
