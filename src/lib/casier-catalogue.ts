// Lecture du CATALOGUE des casiers depuis le classeur « Liste casier Élèves ».
//
// Le catalogue ne retient que le matériel : numéro de casier, numéro de série
// du cadenas, code à trois chiffres. Les colonnes d'élève et de petit casier
// ne le regardent pas — l'attribution est un autre import.
//
// Le classeur décrit les mêmes casiers plusieurs fois : une ligne par élève,
// donc deux fois pour un binôme, et parfois une fois de plus dans la feuille
// des casiers libres. On déduplique par numéro. Deux lignes identiques ne
// posent pas de question ; deux lignes qui se contredisent, si — on ne devine
// pas, on signale et on écarte ce casier-là.
//
// Les colonnes sont repérées par leur EN-TÊTE, pas par leur position : les
// feuilles de niveau commencent par le nom de l'élève, celle des casiers
// libres non, et un décalage codé en dur casserait au premier remaniement.

import ExcelJS from "exceljs";
import { normalizeName } from "@/lib/casier-import";
import {
  divergentConflicts,
  type CatalogueRow,
} from "@/lib/locker-conflicts";

export type CatalogueEntry = {
  number: string;
  serialNumber: string;
  combination: string;
};

export type CatalogueRead = {
  entries: CatalogueEntry[];
  /** Casiers écartés : le classeur en donne deux versions différentes. */
  conflicts: string[];
  /** Toutes les lignes lues, avant déduplication — sert à écrire les
   *  contradictions en base pour que les écrans puissent les signaler. */
  raw: CatalogueRow[];
  /** Ce qui a été lu, feuille par feuille — pour le compte rendu. */
  sheets: { name: string; kept: number }[];
  /** Nombre de lignes retenues avant déduplication. */
  rowsRead: number;
};

type Raw = CatalogueRow;

/** Repère la ligne d'en-tête et les colonnes utiles d'une feuille. */
function locateColumns(
  ws: ExcelJS.Worksheet,
): { headerRow: number; num: number; serial: number; codes: number[] } | null {
  const LAST = Math.min(ws.rowCount, 8);
  for (let r = 1; r <= LAST; r++) {
    const row = ws.getRow(r);
    const at = (c: number) => normalizeName(String(row.getCell(c).text ?? ""));

    let num = 0;
    const codes: number[] = [];
    let serial = 0;
    for (let c = 1; c <= 16; c++) {
      const h = at(c);
      if (!h) continue;
      if (!num && (h === "grand casier" || h === "numero casier")) num = c;
      if (!serial && /^numero (de )?serie$/.test(h)) serial = c;
      if (h === "code cadenas") codes.push(c);
    }
    if (!num) continue;

    // Replis : la série suit le numéro, le code suit la série.
    if (!serial) serial = num + 1;
    if (codes.length === 0) {
      codes.push(serial + 1, serial + 2, serial + 3);
    }
    return { headerRow: r, num, serial, codes };
  }
  return null;
}

/** Une ligne d'en-tête répétée à l'intérieur de la feuille (« Groupe 11 »…). */
function isRepeatedHeader(first: string, number: string): boolean {
  const n = normalizeName(number);
  if (n === "grand casier" || n === "numero casier") return true;
  if (/^groupe\b/.test(normalizeName(first))) return true;
  return false;
}

/**
 * Lit le catalogue de TOUTES les feuilles du classeur.
 * Renvoie `null` si le fichier n'est pas un classeur de cette forme — l'appelant
 * retombe alors sur le CSV `locker_number,serial_number,combination_code`.
 */
export async function parseCatalogueWorkbook(
  buf: Buffer,
): Promise<CatalogueRead | null> {
  // Un .xlsx est un ZIP : il commence par « PK ».
  const isXlsx = buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b;
  if (!isXlsx) return null;

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    return null;
  }

  const raw: Raw[] = [];
  const sheets: { name: string; kept: number }[] = [];

  for (const ws of wb.worksheets) {
    const cols = locateColumns(ws);
    if (!cols) continue; // feuille sans colonne casier : rien à y prendre

    let kept = 0;
    for (let r = cols.headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const at = (c: number) => String(row.getCell(c).text ?? "").trim();
      const number = at(cols.num);
      if (!number) continue;
      if (isRepeatedHeader(at(1), number)) continue;
      if (!/\d/.test(number)) continue; // « — », notes diverses

      raw.push({
        number,
        serialNumber: at(cols.serial),
        combination: cols.codes
          .map(at)
          .filter((c) => c !== "")
          .join("-"),
        where: `${ws.name} ligne ${r}`,
      });
      kept++;
    }
    if (kept > 0) sheets.push({ name: ws.name, kept });
  }

  // Aucune feuille exploitable → ce n'est pas le classeur attendu.
  if (raw.length === 0) return null;

  // Déduplication par numéro : silencieuse si les lignes concordent.
  const byNumber = new Map<string, Raw[]>();
  for (const e of raw) {
    if (!byNumber.has(e.number)) byNumber.set(e.number, []);
    byNumber.get(e.number)!.push(e);
  }

  const entries: CatalogueEntry[] = [];
  // Une seule implémentation de « qu'est-ce qui se contredit » : celle qui
  // servira aussi à écrire les conflits en base.
  const divergent = new Set(divergentConflicts(raw).map((c) => c.number));
  const conflicts: string[] = [];

  for (const [number, list] of byNumber) {
    if (!divergent.has(number)) {
      // Répétitions identiques : un seul enregistrement, sans bruit.
      const { number: n, serialNumber, combination } = list[0];
      entries.push({ number: n, serialNumber, combination });
      continue;
    }
    // Le classeur se contredit : on n'invente pas de vainqueur.
    const variants = new Map<string, Raw[]>();
    for (const e of list) {
      const key = `${e.serialNumber}|${e.combination}`;
      if (!variants.has(key)) variants.set(key, []);
      variants.get(key)!.push(e);
    }
    const detail = [...variants.values()]
      .map((rows) => {
        const v = rows[0];
        return (
          `série ${v.serialNumber || "(vide)"} · code ${v.combination || "(vide)"} ` +
          `(${rows.map((x) => x.where).join(", ")})`
        );
      })
      .join("  ≠  ");
    conflicts.push(
      `Casier ${number} : le classeur en donne ${variants.size} versions différentes — ${detail}. ` +
        `Ce casier n'a pas été importé, et il est signalé aux opérateurs.`,
    );
  }

  entries.sort((a, b) => {
    const na = Number(a.number);
    const nb = Number(b.number);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.number.localeCompare(b.number);
  });

  return { entries, conflicts, raw, sheets, rowsRead: raw.length };
}
