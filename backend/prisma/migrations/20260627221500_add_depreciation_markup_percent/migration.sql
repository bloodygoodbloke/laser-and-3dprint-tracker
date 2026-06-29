-- Add depreciation markup percent setting for billing rules.
PRAGMA foreign_keys=OFF;

ALTER TABLE "BillingSetting" ADD COLUMN "depreciationMarkupPercent" REAL NOT NULL DEFAULT 0;

PRAGMA foreign_keys=ON;
