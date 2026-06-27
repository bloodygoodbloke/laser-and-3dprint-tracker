-- Add depreciation fields to billing settings
ALTER TABLE "BillingSetting" ADD COLUMN "depreciationCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "depreciationHours" REAL NOT NULL DEFAULT 0;

-- Add separate runtime and labour timing fields
ALTER TABLE "Job" ADD COLUMN "machineRunTimeMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "labourTimeMinutes" INTEGER NOT NULL DEFAULT 0;

-- Backfill runtime values from existing estimate field
UPDATE "Job"
SET "machineRunTimeMinutes" = COALESCE("estTimeMinutes", 0),
    "labourTimeMinutes" = COALESCE("estTimeMinutes", 0);
