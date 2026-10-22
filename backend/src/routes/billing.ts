import { Router } from "express";
import prisma from "../prisma";

const router = Router();

const AUDIT_IGNORE_KEYS = new Set(["id", "createdAt", "updatedAt"]);

const toAuditChanges = (beforeValue: Record<string, any> | null, afterValue: Record<string, any>) => {
  const keys = Array.from(new Set([
    ...Object.keys(beforeValue || {}),
    ...Object.keys(afterValue || {}),
  ])).filter((key) => !AUDIT_IGNORE_KEYS.has(key));

  return keys
    .map((key) => {
      const before = beforeValue?.[key];
      const after = afterValue?.[key];
      return {
        field: key,
        before: typeof before === "string" ? before : JSON.stringify(before ?? ""),
        after: typeof after === "string" ? after : JSON.stringify(after ?? ""),
      };
    })
    .filter((entry) => entry.before !== entry.after);
};

router.get("/", async (_req, res) => {
  const settings = await prisma.billingSetting.findMany();
  const setting = settings[0];

  if (!setting) {
    return res.json(null);
  }

  const normalized = {
    ...setting,
    machineElectricitySettings: typeof setting.machineElectricitySettings === "string"
      ? JSON.parse(setting.machineElectricitySettings || "{}")
      : setting.machineElectricitySettings,
    materialTypeMarkups: typeof setting.materialTypeMarkups === "string"
      ? JSON.parse(setting.materialTypeMarkups || "{}")
      : setting.materialTypeMarkups,
  };

  res.json(normalized);
});

router.post("/", async (req, res) => {
  const payload = req.body || {};
  const existing = await prisma.billingSetting.findMany();
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...safePayload } = payload;

  const normalizedPayload = {
    ...safePayload,
    machineElectricitySettings: typeof safePayload.machineElectricitySettings === "string"
      ? safePayload.machineElectricitySettings
      : JSON.stringify(safePayload.machineElectricitySettings || {}),
    materialTypeMarkups: typeof safePayload.materialTypeMarkups === "string"
      ? safePayload.materialTypeMarkups
      : JSON.stringify(safePayload.materialTypeMarkups || {}),
  };

  if (existing[0]) {
    const updated = await prisma.billingSetting.update({
      where: { id: existing[0].id },
      data: normalizedPayload,
    });

    const changes = toAuditChanges(existing[0] as any, updated as any);
    if (changes.length) {
      await prisma.billingAuditLog.create({
        data: {
          entityType: "billing-settings",
          entityId: updated.id,
          action: "update",
          fieldChanges: JSON.stringify(changes),
          summary: `Updated ${changes.length} billing setting field(s).`,
        },
      });
    }

    return res.json({
      ...updated,
      machineElectricitySettings: typeof updated.machineElectricitySettings === "string"
        ? JSON.parse(updated.machineElectricitySettings || "{}")
        : updated.machineElectricitySettings,
      materialTypeMarkups: typeof updated.materialTypeMarkups === "string"
        ? JSON.parse(updated.materialTypeMarkups || "{}")
        : updated.materialTypeMarkups,
    });
  }

  const created = await prisma.billingSetting.create({ data: normalizedPayload });
  await prisma.billingAuditLog.create({
    data: {
      entityType: "billing-settings",
      entityId: created.id,
      action: "create",
      fieldChanges: JSON.stringify([]),
      summary: "Created initial billing settings.",
    },
  });
  res.status(201).json({
    ...created,
    machineElectricitySettings: typeof created.machineElectricitySettings === "string"
      ? JSON.parse(created.machineElectricitySettings || "{}")
      : created.machineElectricitySettings,
    materialTypeMarkups: typeof created.materialTypeMarkups === "string"
      ? JSON.parse(created.materialTypeMarkups || "{}")
      : created.materialTypeMarkups,
  });
});

export default router;
