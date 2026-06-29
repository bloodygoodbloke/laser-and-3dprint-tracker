-- Add invoice-level delivery and VAT settings.
PRAGMA foreign_keys=OFF;

ALTER TABLE "BillingSetting" ADD COLUMN "deliveryAmount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "vatPercent" REAL NOT NULL DEFAULT 0;

PRAGMA foreign_keys=ON;
