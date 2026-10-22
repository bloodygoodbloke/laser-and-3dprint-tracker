-- CHG-058: segmented time tracking fields on jobs.
ALTER TABLE "Job" ADD COLUMN "setupTimeMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "postProcessingMinutes" INTEGER NOT NULL DEFAULT 0;

-- Backfill labour as setup + post-processing where both are currently empty.
UPDATE "Job"
SET
  "setupTimeMinutes" = CASE
    WHEN "labourTimeMinutes" > 0 THEN CAST(ROUND("labourTimeMinutes" * 0.5) AS INTEGER)
    ELSE 0
  END,
  "postProcessingMinutes" = CASE
    WHEN "labourTimeMinutes" > 0 THEN "labourTimeMinutes" - CAST(ROUND("labourTimeMinutes" * 0.5) AS INTEGER)
    ELSE 0
  END
WHERE "setupTimeMinutes" = 0 AND "postProcessingMinutes" = 0;

-- CHG-055: append-only billing/invoice audit log.
CREATE TABLE "BillingAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "fieldChanges" TEXT NOT NULL DEFAULT '[]',
  "summary" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "BillingAuditLog_entityType_createdAt_idx" ON "BillingAuditLog"("entityType", "createdAt");

-- CHG-087: estimate catalog templates for quick pricing reuse.
CREATE TABLE "EstimateTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL DEFAULT '',
  "machineType" TEXT NOT NULL,
  "machineRunTimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "setupTimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "postProcessingMinutes" INTEGER NOT NULL DEFAULT 0,
  "labourTimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "suggestedMaterialGrams" REAL NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '',
  "lastEstimatedBaseCost" REAL NOT NULL DEFAULT 0,
  "lastEstimatedCharge" REAL NOT NULL DEFAULT 0,
  "lastUsedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "EstimateTemplate_name_idx" ON "EstimateTemplate"("name");
CREATE INDEX "EstimateTemplate_updatedAt_idx" ON "EstimateTemplate"("updatedAt");
