import { Router } from "express";
import prisma from "../prisma";

const router = Router();

const isBillingSchemaCompatibilityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("BillingSetting") && (
    message.includes("does not exist")
    || message.includes("Unknown arg")
    || message.includes("Unknown argument")
    || message.includes("has no column")
  );
};

router.get("/", async (_req, res) => {
  try {
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

    return res.json(normalized);
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.json(null);
    }
    const message = error instanceof Error ? error.message : "Failed to load billing settings";
    return res.status(500).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
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
    return res.status(201).json({
      ...created,
      machineElectricitySettings: typeof created.machineElectricitySettings === "string"
        ? JSON.parse(created.machineElectricitySettings || "{}")
        : created.machineElectricitySettings,
      materialTypeMarkups: typeof created.materialTypeMarkups === "string"
        ? JSON.parse(created.materialTypeMarkups || "{}")
        : created.materialTypeMarkups,
    });
  } catch (error) {
    if (isBillingSchemaCompatibilityError(error)) {
      return res.status(503).json({ error: "Billing settings table is behind expected schema. Run migrations to enable billing edits." });
    }
    const message = error instanceof Error ? error.message : "Failed to save billing settings";
    return res.status(500).json({ error: message });
  }
});

export default router;
