-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BillingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialMarkupPercent" REAL NOT NULL DEFAULT 0,
    "materialMarkupAmount" REAL NOT NULL DEFAULT 0,
    "electricityMarkupPercent" REAL NOT NULL DEFAULT 0,
    "electricityMarkupAmount" REAL NOT NULL DEFAULT 0,
    "labourMarkupPercent" REAL NOT NULL DEFAULT 0,
    "labourMarkupAmount" REAL NOT NULL DEFAULT 0,
    "overheadMarkupPercent" REAL NOT NULL DEFAULT 0,
    "overheadMarkupAmount" REAL NOT NULL DEFAULT 0,
    "electricityCostPerKwh" REAL NOT NULL DEFAULT 0.2,
    "labourRate" REAL NOT NULL DEFAULT 20,
    "overheadPercent" REAL NOT NULL DEFAULT 0.15,
    "machineElectricitySettings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BillingSetting" ("createdAt", "electricityMarkupAmount", "electricityMarkupPercent", "id", "labourMarkupAmount", "labourMarkupPercent", "materialMarkupAmount", "materialMarkupPercent", "overheadMarkupAmount", "overheadMarkupPercent", "updatedAt") SELECT "createdAt", "electricityMarkupAmount", "electricityMarkupPercent", "id", "labourMarkupAmount", "labourMarkupPercent", "materialMarkupAmount", "materialMarkupPercent", "overheadMarkupAmount", "overheadMarkupPercent", "updatedAt" FROM "BillingSetting";
DROP TABLE "BillingSetting";
ALTER TABLE "new_BillingSetting" RENAME TO "BillingSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
