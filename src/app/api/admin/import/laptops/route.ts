import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/import-parse";
import { pickField as pick } from "@/lib/import-alias";
import { levelFromGrado } from "@/lib/level";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// DELETE — efface toute la liste des élèves recevant un portable.
// Supprime les livraisons LAPTOP, retire receivesLaptop, et nettoie les
// élèves orphelins (ni portable ni casier). SUPER_ADMIN only.
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const before = await prisma.student.count({
    where: { receivesLaptop: true },
  });
  await prisma.$transaction([
    prisma.delivery.deleteMany({ where: { type: "LAPTOP" } }),
    prisma.student.updateMany({
      where: { receivesLaptop: true },
      data: {
        receivesLaptop: false,
        boxNumber: null,
        laptopSerial: null,
        laptopModel: null,
        laptopStatus: "PENDING",
      },
    }),
    prisma.student.deleteMany({
      where: { receivesLaptop: false, receivesLocker: false },
    }),
  ]);
  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "import.delete",
    target: "liste Portables",
    details: `${before} élève(s) effacé(s)`,
  });
  return NextResponse.json({ ok: true, deleted: before });
}

// POST — import liste PORTABLE (CSV ou Excel .xlsx). SUPER_ADMIN only.
// Columns: student_number,first_name,last_name,email,group,box_number,laptop_serial,laptop_model
// Le niveau (Sec 1-5) vient du sélecteur, passé en ?level=1..5.
// Atomic: si una sola línea tiene error, no se importa nada.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Niveau du sélecteur : sert de REPLI si une ligne n'a pas de niveau propre.
  // Le niveau par ligne (dérivé de « grado ») est prioritaire.
  const fallbackLevel = (new URL(req.url).searchParams.get("level") || "").trim();

  const rows = await parseImport(req);
  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        imported: 0,
        errors: ["Fichier vide ou sans données."],
      },
      { status: 422 },
    );
  }
  const errors: string[] = [];
  const valid: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    group: string;
    level: string;
    boxNumber: string | null;
    laptopSerial: string | null;
    laptopModel: string | null;
    chargerSerial: string | null;
    stylusSerial: string | null;
  }[] = [];

  rows.forEach((row, i) => {
    const line = i + 2; // ligne 1 = en-têtes
    const studentNumber = pick(row, "student_number");
    const firstName = pick(row, "first_name");
    const lastName = pick(row, "last_name");
    const email = pick(row, "email");
    const group = pick(row, "group");

    if (!studentNumber) {
      errors.push(`Ligne ${line}: numéro d'élève manquant`);
      return;
    }
    if (!firstName || !lastName) {
      errors.push(`Ligne ${line}: nom ou prénom manquant (${studentNumber})`);
      return;
    }
    if (!email) {
      errors.push(`Ligne ${line}: courriel manquant (${studentNumber})`);
      return;
    }
    if (!group) {
      errors.push(`Ligne ${line}: groupe manquant (${studentNumber})`);
      return;
    }

    // Niveau : "Sec 1" → "1" (colonne grado/niveau), sinon chiffre du groupe,
    // sinon le sélecteur. Doit finir en "1".."5".
    const levelSrc = pick(row, "level_src");
    let level = levelFromGrado(levelSrc, group);
    if (!["1", "2", "3", "4", "5"].includes(level)) level = fallbackLevel;
    if (!["1", "2", "3", "4", "5"].includes(level)) {
      errors.push(
        `Ligne ${line}: niveau introuvable (${studentNumber}) — choisissez le niveau (Sec 1 à 5) au-dessus.`,
      );
      return;
    }

    valid.push({
      studentNumber,
      firstName,
      lastName,
      email,
      group,
      level,
      boxNumber: pick(row, "box_number") || null,
      laptopSerial: pick(row, "laptop_serial") || null,
      laptopModel: pick(row, "laptop_model") || null,
      chargerSerial: pick(row, "charger_serial") || null,
      stylusSerial: pick(row, "stylus_serial") || null,
    });
  });

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, total: rows.length, imported: 0, errors },
      { status: 422 },
    );
  }

  try {
    await prisma.$transaction(
      valid.map((v) =>
        prisma.student.upsert({
          where: { studentNumber: v.studentNumber },
          // re-import: on ne touche PAS laptopStatus (préserve une remise déjà faite)
          update: {
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            group: v.group,
            level: v.level,
            boxNumber: v.boxNumber,
            laptopSerial: v.laptopSerial,
            laptopModel: v.laptopModel,
            chargerSerial: v.chargerSerial,
            stylusSerial: v.stylusSerial,
            receivesLaptop: true,
          },
          create: {
            studentNumber: v.studentNumber,
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            group: v.group,
            level: v.level,
            boxNumber: v.boxNumber,
            laptopSerial: v.laptopSerial,
            laptopModel: v.laptopModel,
            chargerSerial: v.chargerSerial,
            stylusSerial: v.stylusSerial,
            receivesLaptop: true,
            laptopStatus: "PENDING",
          },
        }),
      ),
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        total: rows.length,
        imported: 0,
        errors: [`Échec de l'import (transaction annulée): ${(e as Error).message}`],
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    imported: valid.length,
    errors: [],
  });
}
