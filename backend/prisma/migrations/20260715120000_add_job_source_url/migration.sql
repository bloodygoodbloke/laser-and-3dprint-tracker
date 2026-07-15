-- Add dedicated source URL storage for external model references (e.g., MakerWorld).
ALTER TABLE "Job" ADD COLUMN "sourceUrl" TEXT NOT NULL DEFAULT '';
