CREATE TABLE "BambuDevice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "serial" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL DEFAULT '',
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "lastSeenAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "BambuDevice_serial_key" ON "BambuDevice"("serial");

CREATE TABLE "BambuMachineStatus" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "jobId" TEXT,
  "nozzleTempC" REAL NOT NULL DEFAULT 0,
  "bedTempC" REAL NOT NULL DEFAULT 0,
  "chamberTempC" REAL NOT NULL DEFAULT 0,
  "progressPct" REAL NOT NULL DEFAULT 0,
  "amsSummary" TEXT NOT NULL DEFAULT '[]',
  "errorCode" TEXT NOT NULL DEFAULT '',
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BambuMachineStatus_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BambuDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BambuMachineStatus_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BambuMachineStatus_deviceId_reportedAt_idx" ON "BambuMachineStatus"("deviceId", "reportedAt");

CREATE TABLE "BambuEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "jobId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BambuEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BambuDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BambuEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BambuEvent_deviceId_createdAt_idx" ON "BambuEvent"("deviceId", "createdAt");

CREATE TABLE "BambuSpoolInventory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "slotName" TEXT NOT NULL,
  "materialName" TEXT NOT NULL DEFAULT '',
  "color" TEXT NOT NULL DEFAULT '',
  "remainingGrams" REAL NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "BambuSpoolInventory_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BambuDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BambuSpoolInventory_deviceId_slotName_key" ON "BambuSpoolInventory"("deviceId", "slotName");

CREATE TABLE "BambuUsageLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "jobId" TEXT,
  "runtimeMinutes" REAL NOT NULL DEFAULT 0,
  "materialGrams" REAL NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'event',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BambuUsageLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BambuDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BambuUsageLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BambuUsageLog_deviceId_createdAt_idx" ON "BambuUsageLog"("deviceId", "createdAt");

CREATE TABLE "BambuMaintenancePrediction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "currentHours" REAL NOT NULL DEFAULT 0,
  "intervalHours" REAL NOT NULL DEFAULT 0,
  "predictedDueHours" REAL NOT NULL DEFAULT 0,
  "riskLevel" TEXT NOT NULL DEFAULT 'Normal',
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "BambuMaintenancePrediction_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BambuDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BambuMaintenancePrediction_deviceId_component_key" ON "BambuMaintenancePrediction"("deviceId", "component");

CREATE TABLE "BambuFailureLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deviceId" TEXT NOT NULL,
  "jobId" TEXT,
  "errorCode" TEXT NOT NULL DEFAULT '',
  "message" TEXT NOT NULL DEFAULT '',
  "severity" TEXT NOT NULL DEFAULT 'Warning',
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" DATETIME,
  CONSTRAINT "BambuFailureLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BambuDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BambuFailureLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BambuFailureLog_deviceId_createdAt_idx" ON "BambuFailureLog"("deviceId", "createdAt");
