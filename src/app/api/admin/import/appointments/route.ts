import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  parseAppointmentWorkbook,
  planAppointmentImport,
} from "@/lib/appointment-import";
import { NextResponse } from "next/server";

// POST — import des créneaux de rendez-vous de la rentrée.
// Query : ?dryRun=1 pour simuler sans rien écrire.
//
// Le classeur n'a pas de numéro de fiche : le rapprochement se fait par nom, et
// STRICTEMENT (voir src/lib/appointment-import.ts). Toute ligne sans
// correspondance exacte est signalée et AUCUNE écriture n'est faite pour elle.
//
// L'import ne touche QUE le champ appointmentTime : ni le flux portable, ni le
// flux casier, ni les remises déjà effectuées.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  // 1) Lire le classeur
  let parsed;
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    parsed = await parseAppointmentWorkbook(buf);
  } catch (e) {
    return NextResponse.json(
      { ok: false, errors: [(e as Error).message] },
      { status: 422 },
    );
  }
  const { rows, sheetName } = parsed;
  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, errors: [`Feuille « ${sheetName} » sans données.`] },
      { status: 422 },
    );
  }

  // 2) Élèves déjà en base (on ne crée jamais d'élève ici)
  const dbStudents = await prisma.student.findMany({
    select: {
      studentNumber: true,
      firstName: true,
      lastName: true,
      receivesLaptop: true,
    },
  });

  // 3) Construire le plan (aucune écriture)
  const plan = planAppointmentImport({ rows, dbStudents });

  const summary = {
    ok: true,
    dryRun,
    sheet: sheetName,
    rowsRead: rows.length,
    matched: plan.assignments.length,
    /** Rapprochés mais absents de la liste réception (pas de portable). */
    withoutLaptopCount: plan.assignments.filter((a) => !a.receivesLaptop).length,
    notMatchedCount: plan.errors.length,
    perSlot: plan.perSlot,
    assignments: plan.assignments.map((a) => ({
      eleve: `${a.lastName} ${a.firstName} (${a.studentNumber})`,
      creneau: a.slot,
    })),
    warnings: plan.warnings,
    errors: plan.errors,
  };

  // 4) Simulation → on s'arrête ici, rien n'est écrit.
  if (dryRun) return NextResponse.json(summary);

  // 5) Écriture : uniquement appointmentTime, en transaction.
  try {
    await prisma.$transaction(
      plan.assignments.map((a) =>
        prisma.student.update({
          where: { studentNumber: a.studentNumber },
          data: { appointmentTime: a.slot },
        }),
      ),
    );
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
    action: "rendezvous.import",
    target: `feuille ${sheetName}`,
    details: `${summary.matched} rendez-vous attribué(s) · ${summary.notMatchedCount} non rapproché(s)`,
  });

  return NextResponse.json(summary);
}

// DELETE — efface tous les créneaux (remet appointmentTime à NULL).
// Filet de sécurité : permet de repartir de zéro sans toucher au reste.
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const res = await prisma.student.updateMany({
    where: { appointmentTime: { not: null } },
    data: { appointmentTime: null },
  });
  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "rendezvous.delete",
    target: "créneaux de rendez-vous",
    details: `${res.count} créneau(x) effacé(s)`,
  });
  return NextResponse.json({ ok: true, cleared: res.count });
}
