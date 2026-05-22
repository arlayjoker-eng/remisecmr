// Réinitialise les données de RemiseCMR — SUPPRIME tous les élèves,
// casiers, remises et le journal d'audit. Les comptes UTILISATEURS sont
// conservés. À utiliser avant d'importer les vraies listes.
//
// Usage (sur le VPS, dans /var/www/remisecmr) :
//   node scripts/reset-data.mjs            → affiche l'avertissement
//   node scripts/reset-data.mjs --confirm  → exécute la suppression
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--confirm")) {
    const s = await prisma.student.count();
    const l = await prisma.locker.count();
    const d = await prisma.delivery.count();
    console.log("");
    console.log("⚠️  RÉINITIALISATION DES DONNÉES");
    console.log("    Cela SUPPRIME définitivement :");
    console.log(`      • ${s} élève(s)`);
    console.log(`      • ${l} casier(s)`);
    console.log(`      • ${d} remise(s) + le journal d'audit`);
    console.log("    Les comptes utilisateurs (admin, etc.) sont CONSERVÉS.");
    console.log("");
    console.log("    Faites une sauvegarde AVANT (scripts/backup-db.sh).");
    console.log("    Pour confirmer :  node scripts/reset-data.mjs --confirm");
    console.log("");
    return;
  }

  // Ordre important — les remises et casiers référencent les élèves.
  const d = await prisma.delivery.deleteMany({});
  const l = await prisma.locker.deleteMany({});
  const a = await prisma.auditLog.deleteMany({});
  const s = await prisma.student.deleteMany({});

  console.log("");
  console.log(`✓ Supprimé : ${s.count} élève(s), ${l.count} casier(s), ` +
    `${d.count} remise(s), ${a.count} entrée(s) d'audit.`);
  console.log("✓ Comptes utilisateurs conservés.");
  console.log("✓ Base prête pour l'import des vraies listes.");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Erreur :", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
