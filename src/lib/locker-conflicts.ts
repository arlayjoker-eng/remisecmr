// Contradictions dans les données des casiers — détection et diffusion.
//
// Deux familles, de natures différentes :
//   • DIVERGENT — le classeur décrit UN MÊME casier avec des séries ou des
//     codes différents selon la ligne. Impossible à retrouver après coup : la
//     base ne garde qu'une version, parfois aucune (le casier est écarté à
//     l'import). On l'écrit donc au moment où on la voit.
//   • SERIE_PARTAGEE — un même numéro de série apparaît sur deux casiers. Un
//     cadenas ne pouvant pas être à deux endroits, l'un des deux est faux.
//     Celle-là se recalcule depuis la base à tout moment.
//
// Rien de tout cela ne bloque une remise : l'opérateur est averti, il tranche.

import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

/** Une ligne de casier lue dans le classeur, avec sa provenance. */
export type CatalogueRow = {
  number: string;
  serialNumber: string;
  combination: string;
  where: string;
};

export type ConflictKind =
  | "DIVERGENT"
  | "SERIE_PARTAGEE"
  | "ELEVE_DEUX_CASIERS"
  | "CASIER_SURCHARGE"
  | "DESACCORD_OCCUPANT"
  | "SANS_CASIER";

export type ConflictSeed = {
  number: string | null;
  kind: ConflictKind;
  field: string;
  values: string;
  otherNumber: string | null;
  studentNumber: string | null;
};

/**
 * Tout ce qui se relit dans la base. Ces conflits sont recalculés après chaque
 * import et chaque correction : ils reflètent l'état courant, donc un problème
 * réglé disparaît de lui-même.
 *
 * DIVERGENT n'en fait PAS partie : deux lignes du classeur qui se contredisent
 * ne laissent aucune trace en base, cette information n'existe qu'à l'import.
 */
export const DERIVED_KINDS: ConflictKind[] = [
  "SERIE_PARTAGEE",
  "ELEVE_DEUX_CASIERS",
  "CASIER_SURCHARGE",
  "DESACCORD_OCCUPANT",
  "SANS_CASIER",
];

/**
 * Deux lignes du classeur qui se contredisent sur un même casier.
 * Les répétitions identiques (un casier revient une fois par élève) ne disent
 * rien de neuf et ne produisent aucun conflit.
 */
export function divergentConflicts(rows: CatalogueRow[]): ConflictSeed[] {
  const byNumber = new Map<string, CatalogueRow[]>();
  for (const r of rows) {
    if (!byNumber.has(r.number)) byNumber.set(r.number, []);
    byNumber.get(r.number)!.push(r);
  }

  const out: ConflictSeed[] = [];
  for (const [number, list] of byNumber) {
    const serials = new Set(list.map((r) => r.serialNumber));
    const codes = new Set(list.map((r) => r.combination));
    if (serials.size <= 1 && codes.size <= 1) continue;

    const field =
      serials.size > 1 && codes.size > 1
        ? "série et code"
        : serials.size > 1
          ? "série"
          : "code";

    // Une version par variante, avec l'endroit exact où la lire.
    const seen = new Map<string, CatalogueRow[]>();
    for (const r of list) {
      const key = `${r.serialNumber}|${r.combination}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(r);
    }
    const values = [...seen.values()]
      .map((group) => {
        const v = group[0];
        return (
          `série ${v.serialNumber || "(vide)"} · code ${v.combination || "(vide)"}` +
          ` — ${group.map((g) => g.where).join(", ")}`
        );
      })
      .join("   ≠   ");

    out.push({
      number,
      kind: "DIVERGENT",
      field,
      values,
      otherNumber: null,
      studentNumber: null,
    });
  }
  return out;
}

/**
 * Un même numéro de série sur deux casiers. Se lit directement dans la base,
 * donc reste juste même après une correction faite à la main.
 */
export async function sharedSerialConflicts(db: Db): Promise<ConflictSeed[]> {
  const lockers = await db.locker.findMany({
    where: { NOT: { serialNumber: null } },
    select: { number: true, serialNumber: true, combinationCode: true },
  });

  const bySerial = new Map<string, typeof lockers>();
  for (const l of lockers) {
    const s = (l.serialNumber ?? "").trim();
    if (!s) continue;
    if (!bySerial.has(s)) bySerial.set(s, []);
    bySerial.get(s)!.push(l);
  }

  const out: ConflictSeed[] = [];
  for (const [serial, list] of bySerial) {
    if (list.length < 2) continue;
    for (const l of list) {
      const others = list.filter((o) => o.number !== l.number);
      if (others.length === 0) continue;
      out.push({
        number: l.number,
        kind: "SERIE_PARTAGEE",
        field: "série",
        values:
          `Le cadenas ${serial} est aussi enregistré sur le casier ` +
          others.map((o) => `${o.number} (code ${o.combinationCode})`).join(", ") +
          `. Un cadenas ne peut pas être à deux endroits : l'un des deux numéros est faux.`,
        otherNumber: others[0].number,
        studentNumber: null,
      });
    }
  }
  return out;
}

/**
 * Les quatre désaccords entre la FICHE de l'élève et les RANGEMENTS du casier.
 *
 * La base empêche un élève d'occuper deux casiers : `assignedStudentNumberA` et
 * `assignedStudentNumberB` sont uniques. En revanche `Student.assignedLockerNumber`
 * est un simple champ libre. Tous les cas ci-dessous sont donc la même fracture
 * vue sous quatre angles : ce que la fiche de l'élève prétend, contre ce que les
 * casiers enregistrent vraiment.
 *
 * Tout se relit dans la base — aucun besoin de ré-importer quoi que ce soit.
 */
export async function studentPlacementConflicts(db: Db): Promise<ConflictSeed[]> {
  const students = await db.student.findMany({
    where: {
      OR: [{ receivesLocker: true }, { NOT: { assignedLockerNumber: null } }],
    },
    select: {
      studentNumber: true,
      firstName: true,
      lastName: true,
      receivesLocker: true,
      assignedLockerNumber: true,
    },
  });
  const lockers = await db.locker.findMany({
    select: {
      number: true,
      assignedStudentNumberA: true,
      assignedStudentNumberB: true,
    },
  });

  const nameOf = new Map(
    students.map((s) => [s.studentNumber, `${s.lastName} ${s.firstName}`]),
  );
  const label = (sn: string) => nameOf.get(sn) ?? sn;

  // Où l'élève est-il RÉELLEMENT rangé (créneau A ou B d'un casier) ?
  const slotOf = new Map<string, string>();
  const occupantsOf = new Map<string, string[]>();
  const known = new Set<string>();
  for (const l of lockers) {
    known.add(l.number);
    const occ: string[] = [];
    for (const sn of [l.assignedStudentNumberA, l.assignedStudentNumberB]) {
      if (!sn) continue;
      slotOf.set(sn, l.number);
      occ.push(sn);
    }
    occupantsOf.set(l.number, occ);
  }

  // Ce que les fiches PRÉTENDENT.
  const claimantsOf = new Map<string, string[]>();
  for (const s of students) {
    const n = s.assignedLockerNumber;
    if (!n) continue;
    if (!claimantsOf.has(n)) claimantsOf.set(n, []);
    claimantsOf.get(n)!.push(s.studentNumber);
  }

  const out: ConflictSeed[] = [];

  for (const s of students) {
    const sn = s.studentNumber;
    const claim = s.assignedLockerNumber;
    const slot = slotOf.get(sn) ?? null;

    // 1) La fiche désigne un casier, les rangements un autre : l'élève apparaît
    //    à deux endroits à la fois.
    if (claim && slot && claim !== slot) {
      out.push({
        number: slot,
        kind: "ELEVE_DEUX_CASIERS",
        field: "casier",
        values:
          `${label(sn)} occupe le casier ${slot}, mais sa fiche le rattache au ` +
          `casier ${claim}. Les deux ne peuvent pas être vrais : corrigez le ` +
          `numéro pour que la fiche et le casier disent la même chose.`,
        otherNumber: claim,
        studentNumber: sn,
      });
      continue;
    }

    // 2) La fiche désigne un casier où l'élève n'est pas rangé.
    if (claim && !slot) {
      const occ = occupantsOf.get(claim) ?? [];
      const values = !known.has(claim)
        ? `${label(sn)} est rattaché au casier ${claim}, qui n'existe pas dans ` +
          `le catalogue. Importez le catalogue ou corrigez le numéro.`
        : occ.length > 0
          ? `${label(sn)} est rattaché au casier ${claim}, mais ce casier est ` +
            `occupé par ${occ.map(label).join(" et ")}. Il n'y a pas de place ` +
            `pour lui tant que ce n'est pas tranché.`
          : `${label(sn)} est rattaché au casier ${claim}, mais ce casier n'a ` +
            `aucun occupant enregistré. Le rattachement n'a jamais été confirmé.`;
      out.push({
        number: claim,
        kind: "DESACCORD_OCCUPANT",
        field: "occupant",
        values,
        otherNumber: null,
        studentNumber: sn,
      });
      continue;
    }

    // 3) Doit recevoir un casier, n'en a nulle part.
    if (s.receivesLocker && !claim && !slot) {
      out.push({
        number: null,
        kind: "SANS_CASIER",
        field: "casier",
        values:
          `${label(sn)} doit recevoir un casier, mais aucun ne lui est ` +
          `attribué — ni dans sa fiche, ni dans un casier. À attribuer au comptoir.`,
        otherNumber: null,
        studentNumber: sn,
      });
    }
  }

  // 4) Plus de deux élèves sur un même casier. On réunit ceux qui l'occupent
  //    et ceux qui le revendiquent : un casier ne tient que deux places.
  for (const number of new Set([...occupantsOf.keys(), ...claimantsOf.keys()])) {
    const all = new Set([
      ...(occupantsOf.get(number) ?? []),
      ...(claimantsOf.get(number) ?? []),
    ]);
    if (all.size <= 2) continue;
    out.push({
      number,
      kind: "CASIER_SURCHARGE",
      field: "occupants",
      values:
        `Casier ${number} : ${all.size} élèves y sont rattachés — ` +
        `${[...all].map(label).join(", ")}. Un casier ne tient que deux places.`,
      otherNumber: null,
      studentNumber: null,
    });
  }

  return out;
}

/**
 * Remplace l'ensemble des conflits par celui qu'on vient de calculer.
 * Remplacer plutôt que compléter : un conflit corrigé doit disparaître, sinon
 * l'opérateur finit par ignorer des avertissements périmés.
 *
 * `keepDivergent` garde les divergences du classeur quand on ne recalcule que
 * ce qui se relit dans la base : sans le fichier sous la main, on ne saurait
 * pas les redéduire, et les effacer les perdrait pour de bon.
 */
export async function replaceConflicts(
  db: Db,
  seeds: ConflictSeed[],
  opts: { keepDivergent: boolean },
): Promise<number> {
  if (opts.keepDivergent) {
    await db.lockerConflict.deleteMany({ where: { kind: { in: DERIVED_KINDS } } });
  } else {
    await db.lockerConflict.deleteMany({});
  }
  for (const s of seeds) {
    await db.lockerConflict.create({ data: s });
  }
  return seeds.length;
}

/**
 * Recalcule TOUT ce qui se relit dans la base — cadenas partagés et désaccords
 * entre fiches et casiers — et le réécrit, en gardant les divergences du
 * classeur. À appeler après chaque écriture qui touche un casier ou une fiche.
 */
export async function refreshDerivedConflicts(db: Db): Promise<number> {
  const seeds = [
    ...(await sharedSerialConflicts(db)),
    ...(await studentPlacementConflicts(db)),
  ];
  return replaceConflicts(db, seeds, { keepDivergent: true });
}

/** Ancien nom, conservé le temps que les appelants migrent. */
export const refreshSharedSerialConflicts = refreshDerivedConflicts;

/** Ce que les écrans affichent : les conflits d'un casier, prêts à lire. */
export type LockerConflictView = {
  number: string | null;
  kind: string;
  field: string;
  values: string;
  otherNumber: string | null;
  studentNumber: string | null;
};

/**
 * Deux index sur le même jeu de conflits : par casier et par élève. Le second
 * est indispensable — un élève « qui doit recevoir un casier et n'en a pas »
 * n'a aucun numéro auquel se raccrocher, et sa ligne doit quand même rougir.
 */
export async function conflictIndex(db: Db): Promise<{
  byNumber: Map<string, LockerConflictView[]>;
  byStudent: Map<string, LockerConflictView[]>;
}> {
  const rows = await db.lockerConflict.findMany({
    orderBy: [{ kind: "asc" }, { number: "asc" }],
    select: {
      number: true,
      kind: true,
      field: true,
      values: true,
      otherNumber: true,
      studentNumber: true,
    },
  });
  const byNumber = new Map<string, LockerConflictView[]>();
  const byStudent = new Map<string, LockerConflictView[]>();
  for (const r of rows) {
    if (r.number) {
      if (!byNumber.has(r.number)) byNumber.set(r.number, []);
      byNumber.get(r.number)!.push(r);
    }
    if (r.studentNumber) {
      if (!byStudent.has(r.studentNumber)) byStudent.set(r.studentNumber, []);
      byStudent.get(r.studentNumber)!.push(r);
    }
  }
  return { byNumber, byStudent };
}

/** Index par casier seul, pour les appelants qui n'ont qu'un numéro. */
export async function conflictsByNumber(
  db: Db,
): Promise<Map<string, LockerConflictView[]>> {
  return (await conflictIndex(db)).byNumber;
}
