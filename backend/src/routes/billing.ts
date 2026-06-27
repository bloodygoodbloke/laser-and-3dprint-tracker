import { Router } from "express";
import prisma from "../prisma";

const router = Router();

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

  const normalizedPayload = {
    ...payload,
    machineElectricitySettings: typeof payload.machineElectricitySettings === "string"
      ? payload.machineElectricitySettings
      : JSON.stringify(payload.machineElectricitySettings || {}),
    materialTypeMarkups: typeof payload.materialTypeMarkups === "string"
      ? payload.materialTypeMarkups
      : JSON.stringify(payload.materialTypeMarkups || {}),
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
