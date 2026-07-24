-- Add persisted admin theme color settings for configurable Admin tab appearance.
ALTER TABLE "BillingSetting" ADD COLUMN "adminBackgroundColor" TEXT NOT NULL DEFAULT '#0f172a';
ALTER TABLE "BillingSetting" ADD COLUMN "adminTextColor" TEXT NOT NULL DEFAULT '#e2e8f0';
