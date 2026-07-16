import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Minimal seed: only the SUPER_ADMIN account.
// Students and lockers are loaded later via /admin/import (real CSV).
async function main() {
  // Sécurité (CN-003) : aucun identifiant par défaut dans le code source.
  // Les deux variables sont obligatoires — le seed échoue sinon.
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD doivent être définis dans l'environnement avant de lancer le seed.",
    );
  }
  // TODO: volver a 8+ en producción
  if (password.length < 6) {
    throw new Error("SUPER_ADMIN_PASSWORD doit faire au moins 6 caractères.");
  }
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
