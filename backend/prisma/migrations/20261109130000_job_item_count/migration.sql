ALTER TABLE "Job" ADD COLUMN "itemCount" INTEGER NOT NULL DEFAULT 1;

UPDATE "Job"
SET "labourTimeMinutes" = "labourTimeMinutes" + "postProcessingMinutes",
    "postProcessingMinutes" = 0
WHERE "postProcessingMinutes" > 0;
