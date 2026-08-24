// Import des casiers depuis le classeur Excel « Liste casier Élèves ».
//
// Deux cas, une seule règle de rapprochement :
//   • Sec 1  → les colonnes casier sont VIDES. Le système forme les binômes
//     2 par 2 dans l'ordre de la liste et puise les casiers dans la feuille
//     « Casier libre Futur Sec 1 ». S'il reste un élève impair, il reçoit un
//     casier individuel (aucun casier gaspillé, aucun élève perdu).
//   • Sec 2-5 → chaque ligne porte déjà son « Grand Casier ». Les élèves qui
//     partagent le même Grand Casier sont binômes. La colonne « Numéro série »
//     N'EST PAS un critère (elle se répète entre élèves non jumelés).
//
// Rapprochement élève : STRICT. Le nom de la feuille (« Nom Prénoms ») est
// normalisé (minuscules, sans accents, espaces compactés) et doit correspondre
// EXACTEMENT à « lastName firstName » d'un élève déjà en base. Aucun
// rapprochement approximatif : sans correspondance exacte, on ne touche à rien
// et on signale la ligne.

import ExcelJS from "exceljs";

/** Nom de la feuille des casiers encore libres, réservés aux futurs Sec 1. */
export const FREE_LOCKERS_SHEET = "Casier libre Futur Sec 1";

export type SheetRow = {
  /** Nom complet tel qu'écrit dans la feuille (colonne 1). */
  rawName: string;
  /** Numéro de grand casier (colonne 2) — vide en Sec 1. */
  grandCasier: string;
  /** Numéro de série du cadenas (colonne 3) — jamais un critère de binôme. */
  serialNumber: string;
  /** Les 3 chiffres de la combinaison (colonnes 4-5-6). */
  combination: string;
  /** Petit casier (colonne 7), informatif. */
  petitCasier: string;
  /** Ligne dans la feuille, pour les messages d'erreur. */
  line: number;
};

export type FreeLocker = {
  number: string;
  serialNumber: string;
  combination: string;
  line: number;
};

export type DbStudent = {
  studentNumber: string;
  firstName: string;
  lastName: string;
};

export type PlannedAssignment = {
  lockerNumber: string;
  serialNumber: string;
  combination: string;
  petitCasierA: string;
  petitCasierB: string;
  studentA: DbStudent;
  studentB: DbStudent | null;
};

export type ImportPlan = {
  assignments: PlannedAssignment[];
  /** Élèves seuls dans leur casier — à signaler, pas une erreur. */
  warnings: string[];
  /** Lignes non traitées : aucune écriture n'est faite pour elles. */
  errors: string[];
  /** Lignes d'en-tête répétées ignorées (« Groupe 11 »…). */
  skipped: string[];
};

const cell = (row: ExcelJS.Row, col: number): string =>
  String(row.getCell(col).text ?? "").trim();

/**
 * Lit le classeur : la feuille « Sec N » du niveau demandé, plus la feuille des
 * casiers libres (nécessaire seulement pour Sec 1).
 * Colonnes attendues : 1=Nom, 2=Grand Casier, 3=Numéro série, 4-5-6=Code
 * cadenas, 7=Petit Casier. Feuille libre : 1=Numéro casier, 2=Série, 3-4-5=Code.
 */
export async function parseCasierWorkbook(
  buf: Buffer,
  level: string,
): Promise<{ rows: SheetRow[]; freeLockers: FreeLocker[]; sheetName: string }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  const sheetName = `Sec ${level}`;
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    const available = wb.worksheets.map((w) => w.name).join(", ");
    throw new Error(
      `Feuille « ${sheetName} » introuvable dans le classeur. Feuilles présentes : ${available}`,
    );
  }

  const rows: SheetRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawName = cell(row, 1);
    if (!rawName) continue;
    const codes = [cell(row, 4), cell(row, 5), cell(row, 6)].filter(
      (c) => c !== "",
    );
    rows.push({
      rawName,
      grandCasier: cell(row, 2),
      serialNumber: cell(row, 3),
      combination: codes.join("-"),
      petitCasier: cell(row, 7),
      line: r,
    });
  }

  const freeLockers: FreeLocker[] = [];
  if (level === "1") {
    const wsFree = wb.getWorksheet(FREE_LOCKERS_SHEET);
    if (!wsFree) {
      throw new Error(
        `Feuille « ${FREE_LOCKERS_SHEET} » introuvable — elle est requise pour attribuer les casiers des Sec 1.`,
      );
    }
    for (let r = 2; r <= wsFree.rowCount; r++) {
      const row = wsFree.getRow(r);
      const number = cell(row, 1);
      if (!number) continue;
      const codes = [cell(row, 3), cell(row, 4), cell(row, 5)].filter(
        (c) => c !== "",
      );
      freeLockers.push({
        number,
        serialNumber: cell(row, 2),
        combination: codes.join("-"),
        line: r,
      });
    }
  }

  return { rows, freeLockers, sheetName };
}

/** Minuscules, sans accents, espaces compactés. Base du rapprochement strict. */
export function normalizeName(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Les feuilles répètent leur ligne d'en-tête à chaque sous-groupe
 * (« Groupe 11 » + « Grand Casier »…). Ce ne sont pas des élèves.
 */
export function isHeaderRow(row: SheetRow): boolean {
  const n = normalizeName(row.rawName);
  if (!n) return true;
  if (/^groupe\b/.test(n)) return true;
  if (normalizeName(row.grandCasier) === "grand casier") return true;
  return false;
}

/** Index « nom normalisé » → élève. Les homonymes sont signalés, jamais devinés. */
export function indexStudentsByName(students: DbStudent[]): {
  index: Map<string, DbStudent>;
  ambiguous: Set<string>;
} {
  const index = new Map<string, DbStudent>();
  const ambiguous = new Set<string>();
  for (const s of students) {
    const key = normalizeName(`${s.lastName} ${s.firstName}`);
    if (!key) continue;
    if (index.has(key)) ambiguous.add(key);
    index.set(key, s);
  }
  return { index, ambiguous };
}

/**
 * Construit le plan d'import. N'écrit rien : renvoie ce qu'il FAUDRAIT écrire,
 * plus les avertissements et les erreurs. L'appelant décide.
 */
export function planCasierImport(opts: {
  level: string;
  rows: SheetRow[];
  freeLockers: FreeLocker[];
  dbStudents: DbStudent[];
}): ImportPlan {
  const { level, rows, freeLockers, dbStudents } = opts;
  const assignments: PlannedAssignment[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  const { index, ambiguous } = indexStudentsByName(dbStudents);

  // Résout un nom de feuille vers un élève en base — STRICTEMENT.
  const resolve = (row: SheetRow): DbStudent | null => {
    const key = normalizeName(row.rawName);
    if (ambiguous.has(key)) {
      errors.push(
        `Ligne ${row.line} : « ${row.rawName} » correspond à plusieurs élèves en base — à vérifier à la main`,
      );
      return null;
    }
    const found = index.get(key);
    if (!found) {
      errors.push(
        `Ligne ${row.line} : « ${row.rawName} » introuvable en base (aucune correspondance exacte) — à vérifier à la main`,
      );
      return null;
    }
    return found;
  };

  // Filtrer les lignes d'en-tête répétées.
  const dataRows = rows.filter((r) => {
    if (isHeaderRow(r)) {
      skipped.push(`Ligne ${r.line} : en-tête « ${r.rawName} » ignorée`);
      return false;
    }
    return true;
  });

  if (level === "1") {
    // ---- Sec 1 : binômes formés automatiquement, casiers de la feuille libre.
    const resolved: { row: SheetRow; student: DbStudent }[] = [];
    for (const row of dataRows) {
      const student = resolve(row);
      if (student) resolved.push({ row, student });
    }

    let si = 0;
    for (const locker of freeLockers) {
      if (si >= resolved.length) break; // plus d'élèves : casiers restants intacts
      const a = resolved[si];
      const b = si + 1 < resolved.length ? resolved[si + 1] : null;
      assignments.push({
        lockerNumber: locker.number,
        serialNumber: locker.serialNumber,
        combination: locker.combination,
        petitCasierA: a.row.petitCasier,
        petitCasierB: b?.row.petitCasier ?? "",
        studentA: a.student,
        studentB: b?.student ?? null,
      });
      if (!b) {
        warnings.push(
          `${a.student.lastName} ${a.student.firstName} : nombre impair — casier ${locker.number} attribué en individuel`,
        );
        si += 1;
      } else {
        si += 2;
      }
    }
    for (; si < resolved.length; si++) {
      const s = resolved[si].student;
      errors.push(
        `Plus de casiers libres : ${s.lastName} ${s.firstName} (${s.studentNumber}) sans casier`,
      );
    }
    return { assignments, warnings, errors, skipped };
  }

  // ---- Sec 2-5 : regroupement par « Grand Casier » (jamais par numéro de série).
  const groups = new Map<string, { row: SheetRow; student: DbStudent }[]>();
  for (const row of dataRows) {
    const gc = row.grandCasier.trim();
    if (!gc) {
      errors.push(
        `Ligne ${row.line} : « ${row.rawName} » sans Grand Casier — non traité`,
      );
      continue;
    }
    const student = resolve(row);
    if (!student) continue; // erreur déjà signalée, on ne touche à rien
    if (!groups.has(gc)) groups.set(gc, []);
    groups.get(gc)!.push({ row, student });
  }

  for (const [gc, members] of groups) {
    if (members.length > 2) {
      errors.push(
        `Casier ${gc} : ${members.length} élèves (maximum 2) — ${members
          .map((m) => `${m.student.lastName} ${m.student.firstName}`)
          .join(", ")} — non traité`,
      );
      continue;
    }
    const a = members[0];
    const b = members[1] ?? null;
    // La série et la combinaison viennent de la ligne (identiques pour le binôme).
    assignments.push({
      lockerNumber: gc,
      serialNumber: a.row.serialNumber,
      combination: a.row.combination,
      petitCasierA: a.row.petitCasier,
      petitCasierB: b?.row.petitCasier ?? "",
      studentA: a.student,
      studentB: b?.student ?? null,
    });
    if (!b) {
      warnings.push(
        `${a.student.lastName} ${a.student.firstName} : seul dans le casier ${gc} (sans binôme)`,
      );
    }
  }

  return { assignments, warnings, errors, skipped };
}
