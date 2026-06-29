import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  res.json(customers);
});

router.post("/", async (req, res) => {
  const payload = req.body || {};
  const customer = await prisma.customer.create({
    data: {
      name: String(payload.name || "").trim(),
      address: String(payload.address || "").trim(),
      email: String(payload.email || "").trim(),
      phone: String(payload.phone || "").trim(),
      notes: String(payload.notes || "").trim(),
    },
  });
  res.status(201).json(customer);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: String(payload.name || "").trim(),
        address: String(payload.address || "").trim(),
        email: String(payload.email || "").trim(),
        phone: String(payload.phone || "").trim(),
        notes: String(payload.notes || "").trim(),
      },
    });
    res.json(customer);
  } catch (_error) {
    res.status(404).json({ error: "Customer not found" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.customer.delete({ where: { id } });
    res.status(204).send();
  } catch (_error) {
    res.status(404).json({ error: "Customer not found" });
  }
});

router.get("/:id/orders", async (req, res) => {
  const { id } = req.params;
  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const jobs = await prisma.job.findMany({
    where: { customer: customer.name },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { cost: true, materials: true },
  });

  res.json({ customer, jobs });
});

export default router;
