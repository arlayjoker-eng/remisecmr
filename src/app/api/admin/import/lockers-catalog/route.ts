import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/import-parse";
import { NextResponse } from "next/server";

// POST — import du CATALOGUE des casiers physiques. SUPER_ADMIN only.
// Columns: locker_number,serial_number,combination_code
//   ex.  33,566895696,567890
// Les casiers sont créés disponibles (sans élève). L'opérateur en choisit
// un au scan. Ré-import = mise à jour série + code sans toucher l'assignation.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
    number: string;
    serialNumber: string;
    combinationCode: string;
  }[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const line = i + 2;
    const number = (row.locker_number || "").trim();
    const serialNumber = (row.serial_number || "").trim();
    const combinationCode = (row.combination_code || "").trim();

    if (!number) {
      errors.push(`Ligne ${line}: numéro de casier manquant`);
      return;
    }
    if (!serialNumber) {
      errors.push(`Ligne ${line}: numéro de série manquant (casier ${number})`);
      return;
    }
    if (!combinationCode) {
      errors.push(`Ligne ${line}: code du cadenas manquant (casier ${number})`);
      return;
    }
    if (seen.has(number)) {
      errors.push(`Ligne ${line}: casier ${number} en double dans le fichier`);
      return;
    }
    seen.add(number);
    valid.push({ number, serialNumber, combinationCode });
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
        prisma.locker.upsert({
          where: { number: v.number },
          update: {
            serialNumber: v.serialNumber,
            combinationCode: v.combinationCode,
          },
          create: {
            number: v.number,
            serialNumber: v.serialNumber,
            combinationCode: v.combinationCode,
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
