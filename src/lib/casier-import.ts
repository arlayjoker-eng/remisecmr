// Import des casiers depuis le classeur Excel « Liste casier Élèves ».
//
// Le mode de rapprochement se décide sur les DONNÉES, jamais sur le niveau :
//   • Si la feuille porte des « Grand Casier » → ils font foi. Les élèves qui
//     partagent le même Grand Casier sont binômes, quel que soit leur groupe
//     (un binôme peut être à cheval sur deux groupes). La colonne « Numéro
//     série » N'EST PAS un critère (elle se répète entre élèves non jumelés).
//   • Si la colonne est vide de bout en bout → il n'y a rien à lire, alors on
//     forme les binômes 2 par 2 dans l'ordre et on puise les casiers dans la
//     feuille « Casier libre Futur Sec 1 ». Un élève impair reçoit un casier
//     individuel.
// Historiquement on choisissait la 2ᵉ voie dès que le niveau valait 1. C'était
// faux : les feuilles « Sec 1 » réelles portent bien leurs Grand Casier, et
// l'appariement séquentiel se décale dès le premier élève seul — il écrivait
// de mauvais binômes en silence.
//
// Rapprochement élève : STRICT. Le nom de la feuille (« Nom Prénoms ») est
// normalisé (minuscules, sans accents, espaces compactés) et doit correspondre
// EXACTEMENT à « lastName firstName » d'un élève déjà en base. Aucun
// rapprochement approximatif : sans correspondance exacte, on ne touche à rien
// et on signale la ligne.

import ExcelJS from "exceljs";
import Papa from "papaparse";

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
 * Lit le fichier déposé — classeur .xlsx OU une seule feuille exportée en CSV.
 * Colonnes attendues : 1=Nom, 2=Grand Casier, 3=Numéro série, 4-5-6=Code
 * cadenas, 7=Petit Casier. Feuille libre : 1=Numéro casier, 2=Série, 3-4-5=Code.
 *
 * Classeur → on ouvre la feuille « Sec N » du niveau demandé, et la feuille des
 * casiers libres si elle existe. CSV → il n'y a qu'une feuille, c'est celle du
 * niveau passé en paramètre : rien à chercher.
 */
export async function parseCasierWorkbook(
  buf: Buffer,
  level: string,
): Promise<{ rows: SheetRow[]; freeLockers: FreeLocker[]; sheetName: string }> {
  // Un .xlsx est un ZIP : il commence par « PK ». Tout le reste est traité
  // comme du texte délimité (même détection que @/lib/import-parse).
  const isXlsx = buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b;
  if (!isXlsx) return parseCasierCsv(buf, level);

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

  // Facultative : elle ne sert que si la feuille n'a aucun Grand Casier.
  // Son absence n'est donc plus une erreur.
  const freeLockers: FreeLocker[] = [];
  const wsFree = wb.getWorksheet(FREE_LOCKERS_SHEET);
  if (wsFree) {
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

/**
 * Une feuille exportée en CSV : mêmes colonnes, dans le même ordre. Les
 * numéros de ligne restent ceux du tableur pour que les messages d'erreur
 * pointent au bon endroit. Les en-têtes répétées sont écartées plus tard par
 * isHeaderRow(), donc on lit dès la première ligne sans rien présumer.
 */
function parseCasierCsv(
  buf: Buffer,
  level: string,
): { rows: SheetRow[]; freeLockers: FreeLocker[]; sheetName: string } {
  const text = buf.toString("utf-8").replace(/^\uFEFF/, "");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const at = (r: string[], i: number): string => String(r[i] ?? "").trim();

  const rows: SheetRow[] = [];
  parsed.data.forEach((r, i) => {
    const rawName = at(r, 0);
    if (!rawName) return;
    const codes = [at(r, 3), at(r, 4), at(r, 5)].filter((c) => c !== "");
    rows.push({
      rawName,
      grandCasier: at(r, 1),
      serialNumber: at(r, 2),
      combination: codes.join("-"),
      petitCasier: at(r, 6),
      line: i + 1,
    });
  });

  // Un CSV ne porte qu'une feuille : pas de casiers libres à y lire.
  return { rows, freeLockers: [], sheetName: `Sec ${level} (CSV)` };
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
export function indexStudentsByName<T extends DbStudent>(
  students: T[],
): {
  index: Map<string, T>;
  ambiguous: Set<string>;
} {
  const index = new Map<string, T>();
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
  rows: SheetRow[];
  freeLockers: FreeLocker[];
  dbStudents: DbStudent[];
}): ImportPlan {
  const { rows, freeLockers, dbStudents } = opts;
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

  // La feuille porte-t-elle des Grand Casier ? Une seule ligne suffit : c'est
  // que la colonne est renseignée et qu'elle fait foi.
  const hasGrandCasier = dataRows.some((r) => r.grandCasier.trim() !== "");

  if (!hasGrandCasier) {
    // ---- Aucun Grand Casier : binômes 2 par 2, casiers de la feuille libre.
    if (freeLockers.length === 0) {
      errors.push(
        `Aucun « Grand Casier » dans la feuille et aucune feuille « ${FREE_LOCKERS_SHEET} » : ` +
          `impossible de savoir quel casier donner à qui.`,
      );
      return { assignments, warnings, errors, skipped };
    }
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

  // ---- Grand Casier renseigné : il fait foi (jamais le numéro de série).
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
