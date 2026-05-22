import ExcelJS from "exceljs";
import Papa from "papaparse";

// Parse un fichier importé — CSV *ou* Excel (.xlsx) — en lignes objet.
// En-têtes normalisées : minuscules, sans espaces ni BOM.
// Détection automatique : un .xlsx commence par la signature ZIP « PK ».
export async function parseImport(
  req: Request,
): Promise<Record<string, string>[]> {
  const buf = Buffer.from(await req.arrayBuffer());
  const isXlsx = buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b;

  const normHeader = (h: string) =>
    String(h ?? "")
      .trim()
      .toLowerCase()
      .replace(/^﻿/, "");

  if (isXlsx) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) return [];

    const headers: string[] = [];
    ws.getRow(1).eachCell((cell, col) => {
      headers[col] = normHeader(String(cell.text ?? ""));
    });

    const rows: Record<string, string>[] = [];
    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      const obj: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((h, col) => {
        if (!h) return;
        const v = String(row.getCell(col).text ?? "").trim();
        obj[h] = v;
        if (v) hasValue = true;
      });
      if (hasValue) rows.push(obj);
    }
    return rows;
  }

  // sinon → CSV
  const text = buf.toString("utf-8");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normHeader,
  });
  return parsed.data;
}
