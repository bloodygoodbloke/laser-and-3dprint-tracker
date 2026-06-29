-- Add business contact details for footer and invoice identity.
PRAGMA foreign_keys=OFF;

ALTER TABLE "BillingSetting" ADD COLUMN "businessEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BillingSetting" ADD COLUMN "businessPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BillingSetting" ADD COLUMN "businessWebsite" TEXT NOT NULL DEFAULT '';

PRAGMA foreign_keys=ON;
