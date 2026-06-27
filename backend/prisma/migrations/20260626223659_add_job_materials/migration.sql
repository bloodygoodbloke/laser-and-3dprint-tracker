/*
  Warnings:

  - You are about to drop the column `materialId` on the `Job` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "JobMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "usageQuantity" REAL NOT NULL DEFAULT 0,
    "usageUnit" TEXT NOT NULL DEFAULT 'g',
    "usageUnitCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobMaterial_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobNumber" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "customer" TEXT,
    "filePath" TEXT,
    "machineType" TEXT NOT NULL,
    "estTimeMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Job" ("createdAt", "customer", "estTimeMinutes", "filePath", "id", "jobNumber", "machineType", "name", "status", "updatedAt") SELECT "createdAt", "customer", "estTimeMinutes", "filePath", "id", "jobNumber", "machineType", "name", "status", "updatedAt" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_jobNumber_key" ON "Job"("jobNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
