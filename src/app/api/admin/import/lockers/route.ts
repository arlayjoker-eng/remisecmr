import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/import-parse";
import { NextResponse } from "next/server";

// POST — import de la liste des élèves recevant un CASIER. SUPER_ADMIN only.
// Columns: student_number,first_name,last_name,group
// Le niveau (Sec 1-5) vient du sélecteur, passé en ?level=1..5.
// N.B. le casier n'est PAS assigné ici — il est choisi au scan depuis le
// catalogue des casiers. Cet import marque seulement receivesLocker = true.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const level = (new URL(req.url).searchParams.get("level") || "").trim();
  if (!["1", "2", "3", "4", "5"].includes(level)) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        imported: 0,
        errors: ["Sélectionnez le niveau (Sec 1 à 5) avant d'importer."],
      },
      { status: 422 },
    );
  }

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
    group: string;
  }[] = [];

  rows.forEach((row, i) => {
    const line = i + 2;
    const studentNumber = (row.student_number || "").trim();
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    const group = (row.group || "").trim();

    if (!studentNumber) {
      errors.push(`Ligne ${line}: numéro d'élève manquant`);
      return;
    }
    if (!firstName || !lastName) {
      errors.push(`Ligne ${line}: nom ou prénom manquant (${studentNumber})`);
      return;
    }
    if (!group) {
      errors.push(`Ligne ${line}: groupe manquant (${studentNumber})`);
      return;
    }
    valid.push({ studentNumber, firstName, lastName, group });
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
          update: {
            firstName: v.firstName,
            lastName: v.lastName,
            group: v.group,
            level,
            receivesLocker: true,
          },
          create: {
            studentNumber: v.studentNumber,
            firstName: v.firstName,
            lastName: v.lastName,
            group: v.group,
            level,
            receivesLocker: true,
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
        errors: [
          `Échec de l'import (transaction annulée): ${(e as Error).message}`,
        ],
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
