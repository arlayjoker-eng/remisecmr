-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "group" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "boxNumber" TEXT,
    "laptopSerial" TEXT,
    "laptopModel" TEXT,
    "laptopStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "receivesLaptop" BOOLEAN NOT NULL DEFAULT false,
    "receivesLocker" BOOLEAN NOT NULL DEFAULT false,
    "assignedLockerNumber" TEXT,
    "assignedCombinationCode" TEXT,
    "lockerDeliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Locker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "combinationCode" TEXT NOT NULL,
    "assignedStudentNumberA" TEXT,
    "assignedStudentNumberB" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Locker_assignedStudentNumberA_fkey" FOREIGN KEY ("assignedStudentNumberA") REFERENCES "Student" ("studentNumber") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Locker_assignedStudentNumberB_fkey" FOREIGN KEY ("assignedStudentNumberB") REFERENCES "Student" ("studentNumber") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "lockerId" TEXT,
    "folio" TEXT,
    "tutorNameTyped" TEXT,
    "tutorIdLast4" TEXT,
    "signaturePng" BLOB,
    "pdfPath" TEXT,
    "pdfSha256" TEXT,
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Delivery_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Delivery_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "Locker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentNumber_key" ON "Student"("studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Locker_number_key" ON "Locker"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Locker_assignedStudentNumberA_key" ON "Locker"("assignedStudentNumberA");

-- CreateIndex
CREATE UNIQUE INDEX "Locker_assignedStudentNumberB_key" ON "Locker"("assignedStudentNumberB");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_lockerId_key" ON "Delivery"("lockerId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_folio_key" ON "Delivery"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_studentId_type_key" ON "Delivery"("studentId", "type");
