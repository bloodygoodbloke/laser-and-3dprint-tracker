-- Add business personalization fields to billing settings and create CRM customers table.
PRAGMA foreign_keys=OFF;

ALTER TABLE "BillingSetting" ADD COLUMN "businessName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BillingSetting" ADD COLUMN "businessLogoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BillingSetting" ADD COLUMN "businessAddress" TEXT NOT NULL DEFAULT '';

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

PRAGMA foreign_keys=ON;
