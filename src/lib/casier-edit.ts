// Correction manuelle de la fiche casier d'un élève — le NOYAU des règles,
// partagé par le comptoir (/api/casier/student-edit) et les rapports
// (/api/admin/casier/[studentNumber]). Une seule implémentation : les deux
// écrans ne peuvent pas diverger sur ce qui est permis, averti ou refusé.
//
// Le travail se fait en deux temps, volontairement séparés :
//   • planStudentEdit()  — lit, compare, décide. N'écrit RIEN. Renvoie le diff,
//     les avertissements (à signaler) et les conflits (bloquants).
//   • applyStudentEdit() — écrit ce que le plan a décidé, dans la transaction
//     de l'appelant. Ne redécide rien.
// L'appelant peut donc afficher un aperçu, puis replanifier avant d'écrire :
// l'état a pu changer entre les deux appels.

import type { Prisma } from "@prisma/client";
import { levelFromGrado } from "@/lib/level";

/** Un client Prisma ou un client de transaction — les deux conviennent. */
type Db = Prisma.TransactionClient;

/** Champs modifiables. `undefined` = ne pas toucher ; "" = effacer. */
export type EditFields = {
  group?: string;
  lockerNumber?: string;
  petitCasier?: string;
  binomeStudentNumber?: string;
  /** Code du cadenas — utilisé par l'édition depuis les rapports. */
  combinationCode?: string;
};

export type Change = { label: string; before: string; after: string };

type PlanCtx = {
  studentNumber: string;
  lockerId: string | null;
  /** L'élève occupe-t-il le créneau A du casier ? */
  isA: boolean;
  oldPartnerSn: string | null;
  /** Date de remise du titulaire — recopiée sur un binôme ajouté. */
  holderDeliveredAt: Date | null;
  newGroup?: string;
  newLevel?: string;
  newPetitCasier?: string | null;
  newLockerNumber?: string;
  newCombinationCode?: string;
  /** `undefined` = binôme inchangé ; `null` = binôme retiré. */
  newPartnerSn?: string | null;
};

export type EditPlan = {
  changes: Change[];
  /** À signaler à l'opérateur, mais n'empêche pas d'enregistrer. */
  warnings: string[];
  /** Bloquants : tant qu'il en reste un, on n'écrit rien. */
  conflicts: string[];
  ctx: PlanCtx;
};

const LEVELS = ["1", "2", "3", "4", "5"];

const shown = (v: string | null | undefined): string =>
  v && v.trim() ? v : "(vide)";

/**
 * Compare l'état demandé à l'état en base et décide quoi faire.
 * Aucune écriture. Un plan avec des conflits ne doit jamais être appliqué.
 */
export async function planStudentEdit(
  db: Db,
  studentNumber: string,
  fields: EditFields,
): Promise<EditPlan | { notFound: true }> {
  const student = await db.student.findUnique({ where: { studentNumber } });
  if (!student) return { notFound: true };

  const locker = await db.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: studentNumber },
        { assignedStudentNumberB: studentNumber },
      ],
    },
  });
  const isA = locker?.assignedStudentNumberA === studentNumber;
  const oldPartnerSn = locker
    ? isA
      ? locker.assignedStudentNumberB
      : locker.assignedStudentNumberA
    : null;

  const changes: Change[] = [];
  const warnings: string[] = [];
  const conflicts: string[] = [];
  const ctx: PlanCtx = {
    studentNumber,
    lockerId: locker?.id ?? null,
    isA,
    oldPartnerSn,
    holderDeliveredAt: student.lockerDeliveredAt,
  };

  const { group, lockerNumber, petitCasier, binomeStudentNumber, combinationCode } =
    fields;

  // ── 1. Groupe scolaire — le niveau suit le groupe, jamais en silence ──────
  if (group !== undefined && group !== student.group) {
    if (!group) {
      conflicts.push("Le groupe ne peut pas être vide.");
    } else {
      ctx.newGroup = group;
      changes.push({ label: "Groupe", before: student.group, after: group });
      const derived = levelFromGrado("", group);
      if (!LEVELS.includes(derived)) {
        conflicts.push(
          `Groupe « ${group} » : impossible d'en déduire le niveau (attendu 1 à 5).`,
        );
      } else if (derived !== student.level) {
        ctx.newLevel = derived;
        changes.push({
          label: "Niveau",
          before: `Secondaire ${student.level}`,
          after: `Secondaire ${derived}`,
        });
        warnings.push(
          `Changement de niveau (Secondaire ${student.level} → ${derived}) : le casier ` +
            `${locker ? locker.number : "actuel"} pourrait ne pas correspondre au nouveau ` +
            `niveau. Le casier n'est PAS changé automatiquement — vérifiez-le.`,
        );
      }
    }
  }

  // ── 2. Petit casier — propriété individuelle, aucun conflit possible ──────
  if (petitCasier !== undefined && petitCasier !== (student.petitCasier ?? "")) {
    ctx.newPetitCasier = petitCasier || null;
    changes.push({
      label: "Petit casier",
      before: shown(student.petitCasier),
      after: shown(petitCasier),
    });
  }

  // ── 3. Grand casier — renumérotation du casier de l'élève ────────────────
  const wantsLockerEdit =
    lockerNumber !== undefined && lockerNumber !== (locker?.number ?? "");
  if (wantsLockerEdit && !locker) {
    conflicts.push(
      "Cet élève n'a pas encore de casier : attribuez-le d'abord depuis l'écran de remise.",
    );
  } else if (wantsLockerEdit && locker) {
    if (!lockerNumber) {
      conflicts.push("Le numéro de grand casier ne peut pas être vide.");
    } else {
      const clash = await db.locker.findUnique({ where: { number: lockerNumber } });
      if (clash && clash.id !== locker.id) {
        // Un autre casier porte déjà ce numéro : renommer violerait l'unicité,
        // et déplacer l'élève est une autre opération (elle libère l'ancien).
        conflicts.push(
          `Le casier ${lockerNumber} existe déjà. Pour déplacer l'élève vers ce ` +
            `casier, utilisez « Changer le casier (corriger) » — cela libère l'ancien.`,
        );
      } else {
        ctx.newLockerNumber = lockerNumber;
        changes.push({
          label: "Grand casier",
          before: locker.number,
          after: lockerNumber,
        });
      }
    }
  }

  // ── 4. Code du cadenas ───────────────────────────────────────────────────
  if (
    combinationCode !== undefined &&
    locker &&
    combinationCode !== locker.combinationCode
  ) {
    ctx.newCombinationCode = combinationCode;
    changes.push({
      label: "Code du cadenas",
      before: shown(locker.combinationCode),
      after: shown(combinationCode),
    });
  } else if (combinationCode !== undefined && !locker) {
    conflicts.push(
      "Cet élève n'a pas de casier : le code du cadenas n'a rien à modifier.",
    );
  }

  // ── 5. Binôme ────────────────────────────────────────────────────────────
  const wantsBinomeEdit =
    binomeStudentNumber !== undefined &&
    binomeStudentNumber !== (oldPartnerSn ?? "");
  if (wantsBinomeEdit && !locker) {
    conflicts.push(
      "Cet élève n'a pas encore de casier : le binôme se choisit à l'attribution.",
    );
  } else if (wantsBinomeEdit && locker) {
    let resolved: string | null | undefined;
    if (!binomeStudentNumber) {
      resolved = null;
    } else if (binomeStudentNumber === studentNumber) {
      conflicts.push("Le binôme ne peut pas être l'élève lui-même.");
    } else {
      const b = await db.student.findUnique({
        where: { studentNumber: binomeStudentNumber },
      });
      if (!b) {
        conflicts.push(`Binôme introuvable : ${binomeStudentNumber}.`);
      } else {
        const bLocker = await db.locker.findFirst({
          where: {
            OR: [
              { assignedStudentNumberA: binomeStudentNumber },
              { assignedStudentNumberB: binomeStudentNumber },
            ],
          },
        });
        if (bLocker && bLocker.id !== locker.id) {
          conflicts.push(
            `${b.lastName} ${b.firstName} est déjà sur le casier ${bLocker.number}.`,
          );
        } else {
          resolved = binomeStudentNumber;
        }
      }
    }

    if (resolved !== undefined) {
      ctx.newPartnerSn = resolved;
      const label = async (sn: string | null): Promise<string> => {
        if (!sn) return "(aucun)";
        const s = await db.student.findUnique({
          where: { studentNumber: sn },
          select: { firstName: true, lastName: true },
        });
        return s ? `${s.lastName} ${s.firstName}` : sn;
      };
      const beforeLabel = await label(oldPartnerSn);
      changes.push({
        label: "Binôme",
        before: beforeLabel,
        after: await label(resolved),
      });
      // L'ancien binôme perd son casier : ce n'est pas une erreur, mais
      // l'opérateur doit le savoir avant de valider.
      if (oldPartnerSn && oldPartnerSn !== resolved) {
        warnings.push(
          `${beforeLabel} est retiré du casier ${locker.number} et se retrouve ` +
            `SANS casier.`,
        );
      }
    }
  }

  return { changes, warnings, conflicts, ctx };
}

/**
 * Écrit ce que le plan a décidé. À appeler DANS une transaction : la fiche de
 * l'élève, le casier et les caches des deux occupants doivent bouger ensemble.
 * Ne revalide rien — un plan porteur de conflits ne doit pas arriver ici.
 */
export async function applyStudentEdit(tx: Db, plan: EditPlan): Promise<void> {
  const { ctx } = plan;

  // L'élève lui-même : groupe, niveau, petit casier.
  const studentData: {
    group?: string;
    level?: string;
    petitCasier?: string | null;
  } = {};
  if (ctx.newGroup) studentData.group = ctx.newGroup;
  if (ctx.newLevel) studentData.level = ctx.newLevel;
  if (ctx.newPetitCasier !== undefined) {
    studentData.petitCasier = ctx.newPetitCasier;
  }
  if (Object.keys(studentData).length > 0) {
    await tx.student.update({
      where: { studentNumber: ctx.studentNumber },
      data: studentData,
    });
  }

  if (!ctx.lockerId) return;

  // Le casier : numéro, code, créneau du binôme.
  const lockerData: {
    number?: string;
    combinationCode?: string;
    assignedStudentNumberA?: string | null;
    assignedStudentNumberB?: string | null;
  } = {};
  if (ctx.newLockerNumber) lockerData.number = ctx.newLockerNumber;
  if (ctx.newCombinationCode !== undefined) {
    lockerData.combinationCode = ctx.newCombinationCode;
  }
  if (ctx.newPartnerSn !== undefined) {
    if (ctx.isA) lockerData.assignedStudentNumberB = ctx.newPartnerSn;
    else lockerData.assignedStudentNumberA = ctx.newPartnerSn;
  }
  if (Object.keys(lockerData).length === 0) return;

  await tx.locker.update({ where: { id: ctx.lockerId }, data: lockerData });
  const updated = await tx.locker.findUnique({ where: { id: ctx.lockerId } });
  if (!updated) return;

  // L'ancien binôme, écarté : plus de casier, donc plus de date de remise.
  if (
    ctx.newPartnerSn !== undefined &&
    ctx.oldPartnerSn &&
    ctx.oldPartnerSn !== ctx.newPartnerSn
  ) {
    await tx.student.update({
      where: { studentNumber: ctx.oldPartnerSn },
      data: {
        assignedLockerNumber: null,
        assignedCombinationCode: null,
        lockerDeliveredAt: null,
      },
    });
  }

  // Les occupants actuels : cache à jour (le numéro a pu être renommé).
  // Un binôme ajouté hérite de l'état de remise du titulaire au lieu d'une
  // date inventée : corriger une fiche ne vaut pas remise du casier.
  const occupants = [
    updated.assignedStudentNumberA,
    updated.assignedStudentNumberB,
  ].filter(Boolean) as string[];
  for (const sn of occupants) {
    await tx.student.update({
      where: { studentNumber: sn },
      data: {
        assignedLockerNumber: updated.number,
        assignedCombinationCode: updated.combinationCode,
        ...(sn === ctx.newPartnerSn
          ? { lockerDeliveredAt: ctx.holderDeliveredAt }
          : {}),
      },
    });
  }
}

/** Ligne de journal : « Groupe : 110 → 221 · Niveau : Secondaire 1 → 2 ». */
export function auditDetails(plan: EditPlan): string {
  return (
    plan.changes.map((c) => `${c.label} : ${c.before} → ${c.after}`).join(" · ") ||
    "aucun changement"
  );
}
