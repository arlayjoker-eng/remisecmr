-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LockerConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT,
    "kind" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "otherNumber" TEXT,
    "studentNumber" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_LockerConflict" ("detectedAt", "field", "id", "kind", "number", "otherNumber", "values") SELECT "detectedAt", "field", "id", "kind", "number", "otherNumber", "values" FROM "LockerConflict";
DROP TABLE "LockerConflict";
ALTER TABLE "new_LockerConflict" RENAME TO "LockerConflict";
CREATE INDEX "LockerConflict_number_idx" ON "LockerConflict"("number");
CREATE INDEX "LockerConflict_studentNumber_idx" ON "LockerConflict"("studentNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
