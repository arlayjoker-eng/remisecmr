import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Minimal seed: only the SUPER_ADMIN account.
// Students and lockers are loaded later via /admin/import (real CSV).
async function main() {
  const email =
    process.env.SUPER_ADMIN_EMAIL || "agarcia@collegemont-royal.qc.ca";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Cmr216500";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      fullName: "Arlay Garcia",
      role: "SUPER_ADMIN",
      active: true,
      passwordHash,
    },
    create: {
      email,
      fullName: "Arlay Garcia",
      role: "SUPER_ADMIN",
      active: true,
      passwordHash,
    },
  });

  const students = await prisma.student.count();
  const lockers = await prisma.locker.count();
  console.log(
    `Seed OK — SUPER_ADMIN: ${email} | Students: ${students} | Lockers: ${lockers}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
