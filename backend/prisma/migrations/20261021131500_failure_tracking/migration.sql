-- CHG-059: failure tracking fields on jobs.
ALTER TABLE "Job" ADD COLUMN "failureReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "failureWasteGrams" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "failureCost" REAL NOT NULL DEFAULT 0;
