// Import des rendez-vous de la rentrée depuis le classeur « Rendez-vous ».
//
// Le classeur ne porte AUCUN numéro de fiche : uniquement « Nom » et « Prénom ».
// Le rapprochement se fait donc par nom, et STRICTEMENT, selon la même règle que
// l'import des casiers : « Nom Prénom » normalisé (minuscules, sans accents,
// espaces compactés) doit correspondre EXACTEMENT à « lastName firstName » d'un
// élève déjà en base. Aucune approximation, aucun homonyme deviné : sans
// correspondance exacte, la ligne est signalée et rien n'est écrit pour elle.
//
// Le classeur contient deux feuilles qui listent les mêmes élèves (« Alpha »
// triée par nom, « Heure » triée par créneau, avec une ligne « Total » finale).
// On choisit la feuille par ses en-têtes, pas par sa position.

import ExcelJS from "exceljs";
import { normalizeName, indexStudentsByName } from "@/lib/casier-import";
import {
  APPOINTMENT_SLOTS,
  normalizeSlot,
  type AppointmentSlot,
} from "@/lib/appointment-slots";

// Réexport : les appelants côté serveur trouvent tout ici, tandis que l'écran
// de réception importe directement appointment-slots (sans ExcelJS).
export { APPOINTMENT_SLOTS, normalizeSlot };
export type { AppointmentSlot };

export type AppointmentRow = {
  lastName: string;
  firstName: string;
  /** Le créneau tel qu'écrit dans la feuille, pour les messages d'erreur. */
  rawSlot: string;
  line: number;
};

export type DbStudentForAppointment = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  receivesLaptop: boolean;
};

export type PlannedAppointment = {
  studentNumber: string;
  lastName: string;
  firstName: string;
  slot: AppointmentSlot;
  /** Faux ⇒ l'élève n'apparaît pas dans la liste du poste réception. */
  receivesLaptop: boolean;
};

export type AppointmentPlan = {
  assignments: PlannedAppointment[];
  /** Rapprochés, mais quelque chose mérite un coup d'œil. */
  warnings: string[];
  /** Lignes non traitées : aucune écriture n'est faite pour elles. */
  errors: string[];
  /** Répartition par créneau, pour recouper avec la feuille d'origine. */
  perSlot: Record<string, number>;
};

const cell = (row: ExcelJS.Row, col: number): string =>
  String(row.getCell(col).text ?? "").trim();

/**
 * Lit le classeur en repérant les colonnes « Nom », « Prénom » et « RV » par
 * leur en-tête. On ne suppose aucune position de colonne : c'est précisément ce
 * genre de supposition qui casse quand le fichier source change de forme.
 */
export async function parseAppointmentWorkbook(
  buf: Buffer,
): Promise<{ rows: AppointmentRow[]; sheetName: string }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  for (const ws of wb.worksheets) {
    let colNom = 0;
    let colPrenom = 0;
    let colRv = 0;
    ws.getRow(1).eachCell((c, col) => {
      const h = normalizeName(String(c.text ?? ""));
      if (h === "nom") colNom = col;
      else if (h === "prenom") colPrenom = col;
      else if (h === "rv") colRv = col;
    });
    if (!colNom || !colPrenom || !colRv) continue;

    const rows: AppointmentRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const lastName = cell(row, colNom);
      const firstName = cell(row, colPrenom);
      // Sans nom NI prénom, ce n'est pas un élève : ligne vide, ou le
      // « Total » qui clôt la feuille triée par heure.
      if (!lastName && !firstName) continue;
      rows.push({
        lastName,
        firstName,
        rawSlot: cell(row, colRv),
        line: r,
      });
    }
    return { rows, sheetName: ws.name };
  }

  const available = wb.worksheets.map((w) => w.name).join(", ");
  throw new Error(
    `Aucune feuille avec les colonnes « Nom », « Prénom » et « RV ». Feuilles présentes : ${available}`,
  );
}

/**
 * Construit le plan d'import. N'écrit rien : renvoie ce qu'il FAUDRAIT écrire,
 * plus les avertissements et les erreurs. L'appelant décide.
 */
export function planAppointmentImport(opts: {
  rows: AppointmentRow[];
  dbStudents: DbStudentForAppointment[];
}): AppointmentPlan {
  const { rows, dbStudents } = opts;
  const assignments: PlannedAppointment[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const perSlot: Record<string, number> = {};

  const { index, ambiguous } = indexStudentsByName(dbStudents);
  // Un même élève listé deux fois : on garde le premier créneau et on signale,
  // plutôt que d'écraser en silence avec le dernier.
  const seen = new Map<string, { slot: AppointmentSlot; line: number }>();

  for (const row of rows) {
    const who = `${row.lastName} ${row.firstName}`.trim();

    if (!row.lastName || !row.firstName) {
      errors.push(
        `Ligne ${row.line} : nom ou prénom manquant (« ${who} ») — non traité`,
      );
      continue;
    }

    const slot = normalizeSlot(row.rawSlot);
    if (!slot) {
      errors.push(
        `Ligne ${row.line} : ${who} — créneau « ${row.rawSlot} » non reconnu (attendus : ${APPOINTMENT_SLOTS.join(", ")}) — non traité`,
      );
      continue;
    }

    const key = normalizeName(who);
    if (ambiguous.has(key)) {
      errors.push(
        `Ligne ${row.line} : « ${who} » correspond à plusieurs élèves en base — à vérifier à la main`,
      );
      continue;
    }
    const student = index.get(key);
    if (!student) {
      errors.push(
        `Ligne ${row.line} : « ${who} » introuvable en base (aucune correspondance exacte) — à vérifier à la main`,
      );
      continue;
    }

    const already = seen.get(student.studentNumber);
    if (already) {
      errors.push(
        `Ligne ${row.line} : ${who} a déjà un rendez-vous à ${already.slot} (ligne ${already.line}) — ${slot} ignoré`,
      );
      continue;
    }
    seen.set(student.studentNumber, { slot, line: row.line });

    if (!student.receivesLaptop) {
      warnings.push(
        `⚠ ${who} (${student.studentNumber}) : rendez-vous à ${slot}, mais l'élève ne reçoit pas de portable — il n'apparaîtra PAS dans la liste du poste réception`,
      );
    }

    perSlot[slot] = (perSlot[slot] ?? 0) + 1;
    assignments.push({
      studentNumber: student.studentNumber,
      lastName: student.lastName,
      firstName: student.firstName,
      slot,
      receivesLaptop: student.receivesLaptop,
    });
  }

  return { assignments, warnings, errors, perSlot };
}
