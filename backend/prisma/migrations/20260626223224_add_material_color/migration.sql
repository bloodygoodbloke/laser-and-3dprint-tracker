-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "costPerUnit" REAL NOT NULL,
    "stockLevel" REAL NOT NULL,
    "reorderThreshold" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Material" ("costPerUnit", "createdAt", "id", "name", "reorderThreshold", "stockLevel", "type", "unit", "updatedAt") SELECT "costPerUnit", "createdAt", "id", "name", "reorderThreshold", "stockLevel", "type", "unit", "updatedAt" FROM "Material";
DROP TABLE "Material";
ALTER TABLE "new_Material" RENAME TO "Material";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
