// Diagnostic : que contient VRAIMENT le classeur des casiers ?
// Usage : node scripts/inspect-casier-xlsx.mjs "C:/chemin/Liste casier Eleves.xlsx"
// N'écrit rien, ne touche à aucune base : il imprime les feuilles, les colonnes
// et les premières lignes, pour savoir si le « numéro de fiche » y figure.
import ExcelJS from "exceljs";

const file = process.argv[2];
if (!file) {
  console.error('Usage : node scripts/inspect-casier-xlsx.mjs "<chemin.xlsx>"');
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

console.log(`\nFeuilles : ${wb.worksheets.map((w) => w.name).join(" | ")}\n`);

for (const ws of wb.worksheets) {
  console.log(`${"=".repeat(70)}\nFEUILLE « ${ws.name} » — ${ws.rowCount} lignes, ${ws.columnCount} colonnes`);
  for (let r = 1; r <= Math.min(8, ws.rowCount); r++) {
    const cells = [];
    for (let c = 1; c <= Math.min(12, ws.columnCount); c++) {
      cells.push(`[${c}] ${String(ws.getRow(r).getCell(c).text ?? "").trim()}`);
    }
    console.log(`  L${r}: ${cells.join("  ")}`);
  }
}
