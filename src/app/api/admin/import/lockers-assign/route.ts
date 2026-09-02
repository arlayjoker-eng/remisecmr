import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { parseCasierWorkbook, planCasierImport } from "@/lib/casier-import";
import { NextResponse } from "next/server";

// POST — attribution AUTOMATIQUE des casiers depuis le classeur Excel.
// Query : ?level=1..5  et  ?dryRun=1 pour simuler sans rien écrire.
//
//   • Sec 1  : binômes formés 2 par 2, casiers pris dans « Casier libre Futur
//              Sec 1 ». Élève impair → casier individuel.
//   • Sec 2-5: binômes lus depuis la colonne « Grand Casier » de chaque ligne.
//
// Le rapprochement élève est STRICT (nom exact, accents/espaces normalisés).
// Toute ligne sans correspondance est signalée et AUCUNE écriture n'est faite
// pour elle. L'import attribue le casier SANS le marquer remis : la remise
// reste confirmée au comptoir, au scan.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const level = (sp.get("level") || "").trim();
  const dryRun = sp.get("dryRun") === "1";
  if (!["1", "2", "3", "4", "5"].includes(level)) {
    return NextResponse.json(
      { ok: false, errors: ["Sélectionnez le niveau (Sec 1 à 5)."] },
      { status: 422 },
    );
  }

  // 1) Lire le classeur
  let parsed;
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    parsed = await parseCasierWorkbook(buf, level);
  } catch (e) {
    return NextResponse.json(
      { ok: false, errors: [(e as Error).message] },
      { status: 422 },
    );
  }
  const { rows, freeLockers, sheetName } = parsed;
  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, errors: [`Feuille « ${sheetName} » vide.`] },
      { status: 422 },
    );
  }

  // 2) Élèves déjà en base (le rapprochement se fait contre eux, jamais de création)
  const dbStudents = await prisma.student.findMany({
    select: { studentNumber: true, firstName: true, lastName: true },
  });

  // 3) Construire le plan (aucune écriture)
  const plan = planCasierImport({ rows, freeLockers, dbStudents });

  // 4) Détecter les conflits : élève déjà rattaché à un AUTRE casier.
  //    On ne réécrit pas une attribution existante — on la signale.
  const planned = new Set<string>();
  for (const a of plan.assignments) {
    planned.add(a.studentA.studentNumber);
    if (a.studentB) planned.add(a.studentB.studentNumber);
  }
  const plannedLockers = [
    ...new Set(plan.assignments.map((a) => a.lockerNumber)),
  ];
  const existing = await prisma.locker.findMany({
    where: {
      OR: [
        { assignedStudentNumberA: { in: [...planned] } },
        { assignedStudentNumberB: { in: [...planned] } },
        // Aussi les casiers visés par le plan : il faut connaître leurs
        // occupants actuels pour repérer les détachements silencieux.
        { number: { in: plannedLockers } },
      ],
    },
    select: {
      number: true,
      assignedStudentNumberA: true,
      assignedStudentNumberB: true,
    },
  });
  const currentLockerOf = new Map<string, string>();
  const occupantsOf = new Map<string, string[]>();
  for (const l of existing) {
    const occ: string[] = [];
    if (l.assignedStudentNumberA) {
      currentLockerOf.set(l.assignedStudentNumberA, l.number);
      occ.push(l.assignedStudentNumberA);
    }
    if (l.assignedStudentNumberB) {
      currentLockerOf.set(l.assignedStudentNumberB, l.number);
      occ.push(l.assignedStudentNumberB);
    }
    occupantsOf.set(l.number, occ);
  }

  const conflicts: string[] = [];
  const toApply = plan.assignments.filter((a) => {
    const bad: string[] = [];
    for (const s of [a.studentA, a.studentB]) {
      if (!s) continue;
      const cur = currentLockerOf.get(s.studentNumber);
      if (cur && cur !== a.lockerNumber) {
        bad.push(
          `${s.lastName} ${s.firstName} est déjà sur le casier ${cur} (proposé : ${a.lockerNumber})`,
        );
      }
    }
    if (bad.length) {
      conflicts.push(...bad, `→ casier ${a.lockerNumber} non traité`);
      return false;
    }
    return true;
  });

  // 4bis) Détachements silencieux : le casier existe déjà avec un binôme A+B,
  //       mais la feuille ne liste plus qu'un seul des deux. L'écriture mettrait
  //       l'autre place à null. On le SIGNALE sans bloquer : la décision revient
  //       à l'opérateur, qui relit ce rapport avant la vraie écriture.
  const studentByNumber = new Map(
    dbStudents.map((s) => [s.studentNumber, s] as const),
  );
  const detachments: string[] = [];
  for (const a of toApply) {
    const current = occupantsOf.get(a.lockerNumber);
    if (!current || current.length === 0) continue;
    const kept = new Set(
      [a.studentA.studentNumber, a.studentB?.studentNumber].filter(
        (n): n is string => Boolean(n),
      ),
    );
    for (const sn of current) {
      if (kept.has(sn)) continue;
      const s = studentByNumber.get(sn);
      const who = s ? `${s.lastName} ${s.firstName} (${sn})` : sn;
      const reste = a.studentB
        ? `${a.studentA.lastName} ${a.studentA.firstName} + ${a.studentB.lastName} ${a.studentB.firstName}`
        : `${a.studentA.lastName} ${a.studentA.firstName}`;
      detachments.push(
        `⚠ ${who} serait détaché du casier ${a.lockerNumber} (la feuille n'y liste plus que : ${reste})`,
      );
    }
  }

  const summary = {
    ok: true,
    dryRun,
    level,
    sheet: sheetName,
    rowsRead: rows.length,
    freeLockersRead: freeLockers.length,
    binomes: toApply.filter((a) => a.studentB).length,
    individuels: toApply.filter((a) => !a.studentB).length,
    studentsAssigned: toApply.reduce((n, a) => n + (a.studentB ? 2 : 1), 0),
    assignments: toApply.map((a) => ({
      casier: a.lockerNumber,
      combinaison: a.combination,
      A: `${a.studentA.lastName} ${a.studentA.firstName} (${a.studentA.studentNumber})`,
      B: a.studentB
        ? `${a.studentB.lastName} ${a.studentB.firstName} (${a.studentB.studentNumber})`
        : null,
    })),
    warnings: plan.warnings,
    /** Élèves qui perdraient leur place si l'écriture est confirmée. */
    detachments,
    detachmentsCount: detachments.length,
    errors: [...plan.errors, ...conflicts],
    skipped: plan.skipped,
  };

  // 5) Simulation → on s'arrête ici, rien n'est écrit.
  if (dryRun) return NextResponse.json(summary);

  // 6) Écriture : casier créé/mis à jour + rattachement A/B + cache élève.
  //    PAS de Delivery, PAS de lockerDeliveredAt → « attribué, pas encore remis ».
  try {
    await prisma.$transaction(async (tx) => {
      for (const a of toApply) {
        await tx.locker.upsert({
          where: { number: a.lockerNumber },
          update: {
            serialNumber: a.serialNumber || undefined,
            combinationCode: a.combination || undefined,
            assignedStudentNumberA: a.studentA.studentNumber,
            assignedStudentNumberB: a.studentB?.studentNumber ?? null,
          },
          create: {
            number: a.lockerNumber,
            serialNumber: a.serialNumber || null,
            combinationCode: a.combination,
            assignedStudentNumberA: a.studentA.studentNumber,
            assignedStudentNumberB: a.studentB?.studentNumber ?? null,
          },
        });
        await tx.student.update({
          where: { studentNumber: a.studentA.studentNumber },
          data: {
            receivesLocker: true,
            assignedLockerNumber: a.lockerNumber,
            assignedCombinationCode: a.combination,
            ...(a.petitCasierA ? { petitCasier: a.petitCasierA } : {}),
          },
        });
        if (a.studentB) {
          await tx.student.update({
            where: { studentNumber: a.studentB.studentNumber },
            data: {
              receivesLocker: true,
              assignedLockerNumber: a.lockerNumber,
              assignedCombinationCode: a.combination,
              ...(a.petitCasierB ? { petitCasier: a.petitCasierB } : {}),
            },
          });
        }
      }
    });
  } catch (e) {
    return NextResponse.json(
      {
        ...summary,
        ok: false,
        errors: [
          ...summary.errors,
          `Échec de l'écriture (transaction annulée, rien n'a été modifié) : ${(e as Error).message}`,
        ],
      },
      { status: 500 },
    );
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "casier.import.auto",
    target: `Sec ${level}`,
    details: `${toApply.length} casier(s) attribué(s) · ${summary.studentsAssigned} élève(s) · ${summary.errors.length} erreur(s)`,
  });

  return NextResponse.json(summary);
}
