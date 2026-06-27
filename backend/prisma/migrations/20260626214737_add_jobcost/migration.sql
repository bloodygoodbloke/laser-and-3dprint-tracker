-- CreateTable
CREATE TABLE "JobCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialCost" REAL NOT NULL,
    "electricityCost" REAL NOT NULL,
    "labourCost" REAL NOT NULL,
    "overheadCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JobCost_jobId_key" ON "JobCost"("jobId");
