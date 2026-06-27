-- CreateTable
CREATE TABLE "BillingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialMarkupPercent" REAL NOT NULL DEFAULT 0,
    "materialMarkupAmount" REAL NOT NULL DEFAULT 0,
    "electricityMarkupPercent" REAL NOT NULL DEFAULT 0,
    "electricityMarkupAmount" REAL NOT NULL DEFAULT 0,
    "labourMarkupPercent" REAL NOT NULL DEFAULT 0,
    "labourMarkupAmount" REAL NOT NULL DEFAULT 0,
    "overheadMarkupPercent" REAL NOT NULL DEFAULT 0,
    "overheadMarkupAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialCost" REAL NOT NULL,
    "electricityCost" REAL NOT NULL,
    "labourCost" REAL NOT NULL,
    "overheadCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "customerCharge" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobCost" ("createdAt", "electricityCost", "id", "jobId", "labourCost", "materialCost", "overheadCost", "totalCost") SELECT "createdAt", "electricityCost", "id", "jobId", "labourCost", "materialCost", "overheadCost", "totalCost" FROM "JobCost";
DROP TABLE "JobCost";
ALTER TABLE "new_JobCost" RENAME TO "JobCost";
CREATE UNIQUE INDEX "JobCost_jobId_key" ON "JobCost"("jobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
