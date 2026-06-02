-- AlterTable
ALTER TABLE "Annonce" ADD COLUMN "claimedAt" DATETIME;
ALTER TABLE "Annonce" ADD COLUMN "claimedBy" TEXT;
ALTER TABLE "Annonce" ADD COLUMN "claimedByName" TEXT;
