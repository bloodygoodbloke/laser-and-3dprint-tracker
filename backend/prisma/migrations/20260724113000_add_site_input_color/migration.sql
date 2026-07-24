-- Add persisted site input/search background color for theme customization.
ALTER TABLE "BillingSetting" ADD COLUMN "siteInputColor" TEXT NOT NULL DEFAULT '#111827';
