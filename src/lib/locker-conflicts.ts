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

export type ConflictSeed = {
  number: string;
  kind: "DIVERGENT" | "SERIE_PARTAGEE";
  field: string;
  values: string;
  otherNumber: string | null;
};

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

    out.push({ number, kind: "DIVERGENT", field, values, otherNumber: null });
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
      });
    }
  }
  return out;
}

/**
 * Remplace l'ensemble des conflits par celui qu'on vient de calculer.
 * Remplacer plutôt que compléter : un conflit corrigé doit disparaître, sinon
 * l'opérateur finit par ignorer des avertissements périmés.
 *
 * `keepDivergent` conserve les divergences déjà connues quand on ne recalcule
 * que les séries partagées (après une correction de fiche, par exemple) : le
 * classeur n'est pas là, on ne peut pas les redéduire.
 */
export async function replaceConflicts(
  db: Db,
  seeds: ConflictSeed[],
  opts: { keepDivergent: boolean },
): Promise<number> {
  if (opts.keepDivergent) {
    await db.lockerConflict.deleteMany({ where: { kind: "SERIE_PARTAGEE" } });
  } else {
    await db.lockerConflict.deleteMany({});
  }
  for (const s of seeds) {
    await db.lockerConflict.create({ data: s });
  }
  return seeds.length;
}

/** Recalcule les séries partagées et les réécrit, en gardant les divergences. */
export async function refreshSharedSerialConflicts(db: Db): Promise<number> {
  const seeds = await sharedSerialConflicts(db);
  return replaceConflicts(db, seeds, { keepDivergent: true });
}

/** Ce que les écrans affichent : les conflits d'un casier, prêts à lire. */
export type LockerConflictView = {
  number: string;
  kind: string;
  field: string;
  values: string;
  otherNumber: string | null;
};

/** Index « numéro de casier » → conflits, pour colorer une liste d'un coup. */
export async function conflictsByNumber(
  db: Db,
): Promise<Map<string, LockerConflictView[]>> {
  const rows = await db.lockerConflict.findMany({
    orderBy: [{ number: "asc" }, { kind: "asc" }],
    select: {
      number: true,
      kind: true,
      field: true,
      values: true,
      otherNumber: true,
    },
  });
  const map = new Map<string, LockerConflictView[]>();
  for (const r of rows) {
    if (!map.has(r.number)) map.set(r.number, []);
    map.get(r.number)!.push(r);
  }
  return map;
}
