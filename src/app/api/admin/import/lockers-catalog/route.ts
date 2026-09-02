import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/import-parse";
import { parseCatalogueWorkbook } from "@/lib/casier-catalogue";
import {
  divergentConflicts,
  refreshSharedSerialConflicts,
  replaceConflicts,
  sharedSerialConflicts,
} from "@/lib/locker-conflicts";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// DELETE — efface tout le catalogue des casiers.
// Supprime les livraisons CASIER (référencent les casiers), tous les
// casiers, et nettoie le cache casier des élèves. SUPER_ADMIN only.
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const before = await prisma.locker.count();
  await prisma.$transaction([
    prisma.delivery.deleteMany({ where: { type: "CASIER" } }),
    prisma.locker.deleteMany({}),
    prisma.student.updateMany({
      data: {
        assignedLockerNumber: null,
        assignedCombinationCode: null,
        lockerDeliveredAt: null,
      },
    }),
  ]);
  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "import.delete",
    target: "catalogue Casiers",
    details: `${before} casier(s) effacé(s)`,
  });
  return NextResponse.json({ ok: true, deleted: before });
}

// POST — import du CATALOGUE des casiers physiques. SUPER_ADMIN only.
//
// Deux formats acceptés :
//   • le classeur « Liste casier Élèves » tel quel — toutes ses feuilles sont
//     lues, les colonnes repérées par leur en-tête, et les casiers dédupliqués
//     (le classeur répète chaque casier une fois par élève) ;
//   • le CSV historique locker_number,serial_number,combination_code.
//
// Les casiers sont créés disponibles (sans élève). L'opérateur en choisit un au
// scan. Ré-import = mise à jour série + code sans toucher l'assignation.
//
// Les lignes valides sont importées même si d'autres posent problème : sur un
// catalogue de plusieurs centaines de casiers, tout annuler pour un numéro
// douteux coûte plus qu'il ne protège. Ce qui est écarté est listé en clair.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const buf = Buffer.from(await req.arrayBuffer());

  // 1) Le classeur « Liste casier Élèves » ?
  const book = await parseCatalogueWorkbook(buf);
  if (book) {
    const valid = book.entries.filter(
      (e) => e.number && e.serialNumber && e.combination,
    );
    const incomplets = book.entries
      .filter((e) => !e.serialNumber || !e.combination)
      .map(
        (e) =>
          `Casier ${e.number} : ${!e.serialNumber ? "numéro de série" : "code du cadenas"} manquant — non importé`,
      );
    const errors = [...book.conflicts, ...incomplets];

    if (valid.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          total: book.rowsRead,
          imported: 0,
          errors: errors.length
            ? errors
            : ["Aucun casier exploitable dans ce classeur."],
        },
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
              combinationCode: v.combination,
            },
            create: {
              number: v.number,
              serialNumber: v.serialNumber,
              combinationCode: v.combination,
            },
          }),
        ),
      );
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          total: book.rowsRead,
          imported: 0,
          errors: [
            `Échec de l'import (transaction annulée): ${(e as Error).message}`,
          ],
        },
        { status: 500 },
      );
    }

    // Les contradictions relevées sont écrites en base : les écrans de
    // remise et de rapports s'en servent pour avertir l'opérateur. On
    // remplace l'ensemble — un conflit corrigé doit disparaître.
    let flagged = 0;
    try {
      await prisma.$transaction(async (tx) => {
        flagged = await replaceConflicts(
          tx,
          [...divergentConflicts(book.raw), ...(await sharedSerialConflicts(tx))],
          { keepDivergent: false },
        );
      });
    } catch {
      // Le signalement ne doit jamais faire échouer un import réussi.
    }

    await logAudit({
      userId: String(session.user.id ?? ""),
      userName: session.user.name || "?",
      action: "import.catalogue",
      target: "catalogue Casiers",
      details:
        `${valid.length} casier(s) depuis ${book.sheets.length} feuille(s) ` +
        `(${book.rowsRead} lignes lues) · ${errors.length} écarté(s) · ` +
        `${flagged} conflit(s) signalé(s)`,
    });

    return NextResponse.json({
      ok: true,
      // Le total, c'est tout ce que le classeur décrit : les casiers retenus
      // PLUS ceux qu'on a dû écarter. Sinon « 280 / 280 importés, 1 écarté »
      // se contredit à l'écran.
      total: book.entries.length + book.conflicts.length,
      imported: valid.length,
      errors,
      sheets: book.sheets,
      rowsRead: book.rowsRead,
      flagged,
    });
  }

  // 2) Sinon : le CSV historique, inchangé.
  const rows = await parseImport(
    new Request(req.url, { method: "POST", body: buf }),
  );
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

  try {
    await prisma.$transaction((tx) => refreshSharedSerialConflicts(tx));
  } catch {
    // Idem : le signalement ne fait pas échouer l'import.
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    imported: valid.length,
    errors: [],
  });
}
