-- CreateTable
CREATE TABLE "DeliveryArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalDeliveryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "folio" TEXT,
    "tutorNameTyped" TEXT,
    "tutorIdLast4" TEXT,
    "signaturePng" BLOB,
    "pdfPath" TEXT,
    "pdfSha256" TEXT,
    "deliveredAt" DATETIME NOT NULL,
    "canceledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledBy" TEXT NOT NULL,
    "canceledByName" TEXT NOT NULL,
    "reason" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "accessLaptopReports" BOOLEAN NOT NULL DEFAULT false,
    "accessCasierReports" BOOLEAN NOT NULL DEFAULT true,
    "accessReception" BOOLEAN NOT NULL DEFAULT false,
    "canLaptopMode" BOOLEAN NOT NULL DEFAULT true,
    "canCasierMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accessCasierReports", "accessLaptopReports", "accessReception", "active", "createdAt", "email", "fullName", "id", "passwordHash", "role", "updatedAt") SELECT "accessCasierReports", "accessLaptopReports", "accessReception", "active", "createdAt", "email", "fullName", "id", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
