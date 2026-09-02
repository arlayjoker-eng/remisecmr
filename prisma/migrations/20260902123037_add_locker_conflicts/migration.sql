-- CreateTable
CREATE TABLE "LockerConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "otherNumber" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LockerConflict_number_idx" ON "LockerConflict"("number");
