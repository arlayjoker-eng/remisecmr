import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { canCasier } from "@/lib/access";
import {
  applyStudentEdit,
  auditDetails,
  planStudentEdit,
  type EditFields,
} from "@/lib/casier-edit";
import { refreshSharedSerialConflicts } from "@/lib/locker-conflicts";
import { NextResponse } from "next/server";

// POST — correction manuelle de la fiche d'un élève depuis le comptoir casier.
// Quatre champs : groupe scolaire, grand casier, petit casier, binôme.
//
// body: {
//   studentNumber, mode: "preview" | "apply",
//   group?, lockerNumber?, petitCasier?, binomeStudentNumber?
// }
// Un champ absent (undefined) n'est pas touché ; une chaîne vide efface.
//
// Les RÈGLES vivent dans @/lib/casier-edit, partagées avec l'édition depuis les
// rapports : les deux écrans doivent autoriser, avertir et refuser à
// l'identique. Ici on ne fait que l'authentification, le mode et le journal.
//
// Deux temps volontaires : « preview » calcule le diff, les avertissements et
// les conflits SANS rien écrire, pour que l'opérateur confirme sur des
// vérifications réelles du serveur et non sur une supposition du navigateur.
// « apply » REPLANIFIE avant d'écrire — l'état a pu changer entre les deux.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canCasier(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  const apply = body?.mode === "apply";
  if (!studentNumber) {
    return NextResponse.json({ error: "Élève manquant." }, { status: 400 });
  }

  const str = (v: unknown): string | undefined =>
    v === undefined ? undefined : String(v ?? "").trim();
  const fields: EditFields = {
    group: str(body?.group),
    lockerNumber: str(body?.lockerNumber),
    petitCasier: str(body?.petitCasier),
    binomeStudentNumber: str(body?.binomeStudentNumber),
  };

  const plan = await planStudentEdit(prisma, studentNumber, fields);
  if ("notFound" in plan) {
    return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
  }

  const summary = {
    ok: plan.conflicts.length === 0,
    changes: plan.changes,
    warnings: plan.warnings,
    conflicts: plan.conflicts,
    applied: false,
  };

  // Aperçu : on s'arrête ici, rien n'est écrit.
  if (!apply) return NextResponse.json(summary);

  if (plan.conflicts.length > 0) {
    return NextResponse.json(summary, { status: 409 });
  }
  if (plan.changes.length === 0) {
    return NextResponse.json({ ...summary, applied: true, unchanged: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await applyStudentEdit(tx, plan);
      // Une série saisie à la main peut en dupliquer une autre : on
      // recalcule les cadenas partagés dans la même transaction.
      await refreshSharedSerialConflicts(tx);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur de mise à jour.";
    return NextResponse.json(
      {
        ...summary,
        ok: false,
        conflicts: [
          ...plan.conflicts,
          /Unique constraint/i.test(msg)
            ? "Casier ou binôme déjà utilisé par un autre élève."
            : `Échec de l'enregistrement (rien n'a été modifié) : ${msg}`,
        ],
      },
      { status: 409 },
    );
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || session.user.email || "?",
    action: "casier.student.edit",
    target: `élève ${studentNumber}`,
    details: auditDetails(plan),
  });

  return NextResponse.json({ ...summary, applied: true });
}
