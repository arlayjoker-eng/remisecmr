import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  applyStudentEdit,
  auditDetails,
  planStudentEdit,
  type EditFields,
} from "@/lib/casier-edit";
import { refreshSharedSerialConflicts } from "@/lib/locker-conflicts";
import { NextResponse } from "next/server";

// PATCH — édition rapide d'une fiche depuis /reports.
// Champs acceptés (tous facultatifs) :
//   group        → Student.group (le niveau suit le groupe, jamais en silence)
//   casier       → Locker.number
//   code         → Locker.combinationCode
//   binomeNumber → binôme de l'élève (créneau opposé dans le casier)
//   petitCasier  → Student.petitCasier
//
// mode : "preview" calcule le diff/avertissements/conflits sans rien écrire ;
//        "apply" écrit. ABSENT = on écrit, pour ne pas casser les appels
//        existants qui ne connaissent pas le mode.
//
// Les RÈGLES vivent dans @/lib/casier-edit, partagées avec le comptoir
// (/api/casier/student-edit) : les deux écrans autorisent, avertissent et
// refusent à l'identique.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ studentNumber: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "STAFF_MANAGER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { studentNumber } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const preview = body?.mode === "preview";

  const str = (v: unknown): string | undefined =>
    v === undefined ? undefined : String(v ?? "").trim();
  const fields: EditFields = {
    group: str(body?.group),
    lockerNumber: str(body?.casier),
    combinationCode: str(body?.code),
    binomeStudentNumber: str(body?.binomeNumber),
    petitCasier: str(body?.petitCasier),
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

  if (preview) return NextResponse.json(summary);

  if (plan.conflicts.length > 0) {
    // `error` reste renseigné : les anciens appelants n'affichent que ce champ.
    return NextResponse.json(
      { ...summary, error: plan.conflicts[0] },
      { status: 409 },
    );
  }
  if (plan.changes.length === 0) {
    return NextResponse.json({ ...summary, ok: true, applied: true, unchanged: true });
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
    const friendly = /Unique constraint/i.test(msg)
      ? "Casier ou binôme déjà utilisé par un autre élève."
      : `Échec de l'enregistrement (rien n'a été modifié) : ${msg}`;
    return NextResponse.json(
      { ...summary, ok: false, conflicts: [friendly], error: friendly },
      { status: 409 },
    );
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || session.user.email || "?",
    action: "casier.edit",
    target: `élève ${studentNumber}`,
    details: auditDetails(plan),
  });

  return NextResponse.json({ ...summary, ok: true, applied: true });
}
