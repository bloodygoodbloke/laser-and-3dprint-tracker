import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/", async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
  const entityType = String(req.query.entityType || "").trim();

  const logs = await prisma.billingAuditLog.findMany({
    where: entityType ? { entityType } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const normalized = logs.map((entry) => {
    let parsedChanges: unknown[] = [];
    try {
      parsedChanges = JSON.parse(entry.fieldChanges || "[]");
    } catch {
      parsedChanges = [];
    }
    return {
      ...entry,
      fieldChanges: parsedChanges,
    };
  });

  res.json(normalized);
});

export default router;
