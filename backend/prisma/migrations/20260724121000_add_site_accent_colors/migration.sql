-- Add persisted site accent/button theme colors.
ALTER TABLE "BillingSetting" ADD COLUMN "siteAccentColor" TEXT NOT NULL DEFAULT '#22d3ee';
ALTER TABLE "BillingSetting" ADD COLUMN "siteAccentTextColor" TEXT NOT NULL DEFAULT '#042f3a';
