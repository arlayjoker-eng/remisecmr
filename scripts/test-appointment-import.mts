// Vérification de l'import des rendez-vous, sans base de données.
// Usage : npx tsx scripts/test-appointment-import.ts "<chemin.xlsx>"
//
// Le classeur réel sert d'entrée ; la « base » est simulée à partir des noms
// qu'il contient. On vérifie ainsi le rapprochement, les créneaux et le
// comportement sur les cas limites, sans rien écrire nulle part.
import { readFile } from "node:fs/promises";
import {
  parseAppointmentWorkbook,
  planAppointmentImport,
  normalizeSlot,
  type DbStudentForAppointment,
} from "../src/lib/appointment-import";

let failures = 0;
// Sérialisation stable : l'ordre des clés d'un objet ne doit pas faire
// échouer une comparaison de valeurs.
function stable(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return JSON.stringify(
      Object.keys(o)
        .sort()
        .map((k) => [k, o[k]]),
    );
  }
  return JSON.stringify(v);
}

function check(label: string, actual: unknown, expected: unknown) {
  const a = stable(actual);
  const e = stable(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "  OK  " : " ÉCHEC"} ${label}${ok ? "" : `\n         attendu ${e}\n         obtenu  ${a}`}`);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage : npx tsx scripts/test-appointment-import.ts <chemin.xlsx>");
  process.exit(1);
}

console.log("\n— Normalisation des créneaux —");
check("« 8 h 30 » → 8h30", normalizeSlot("8 h 30"), "8h30");
check("« 10 h 00 » → 10h00", normalizeSlot("10 h 00"), "10h00");
check("« 08:30 » → 8h30", normalizeSlot("08:30"), "8h30");
check("« 8h30 » → 8h30", normalizeSlot("8h30"), "8h30");
check("« 12 h 00 » (hors créneaux) → null", normalizeSlot("12 h 00"), null);
check("« Total » → null", normalizeSlot("Total"), null);
check("vide → null", normalizeSlot(""), null);

console.log("\n— Lecture du classeur réel —");
const buf = Buffer.from(await readFile(file));
const { rows, sheetName } = await parseAppointmentWorkbook(buf);
check("feuille choisie par ses en-têtes", sheetName, "Alpha");
check("lignes lues", rows.length, 119);

// « Base » simulée : tous les élèves du classeur, plus du bruit.
const dbAll: DbStudentForAppointment[] = rows.map((r, i) => ({
  studentNumber: String(100000 + i),
  firstName: r.firstName,
  lastName: r.lastName,
  receivesLaptop: true,
}));

console.log("\n— Cas nominal : tous les élèves sont en base —");
const plan = planAppointmentImport({ rows, dbStudents: dbAll });
check("rapprochés", plan.assignments.length, 119);
check("erreurs", plan.errors.length, 0);
check("avertissements", plan.warnings.length, 0);
check("répartition par créneau", plan.perSlot, {
  "8h30": 24, "9h00": 8, "9h30": 15, "10h00": 16, "10h30": 15, "11h00": 9,
  "11h30": 3, "13h00": 11, "13h30": 1, "14h00": 4, "14h30": 5, "15h00": 8,
});
check(
  "total réparti = 119",
  Object.values(plan.perSlot).reduce((a, b) => a + b, 0),
  119,
);

console.log("\n— Accents et casse : le rapprochement reste strict mais tolérant —");
const dbAccents = dbAll.map((s, i) =>
  i === 0
    ? { ...s, lastName: s.lastName.toUpperCase(), firstName: s.firstName.toUpperCase() }
    : s,
);
check(
  "MAJUSCULES rapprochées",
  planAppointmentImport({ rows, dbStudents: dbAccents }).assignments.length,
  119,
);

console.log("\n— Élève absent de la base —");
const dbMissing = dbAll.slice(1);
const planMissing = planAppointmentImport({ rows, dbStudents: dbMissing });
check("rapprochés", planMissing.assignments.length, 118);
check("erreurs", planMissing.errors.length, 1);
check(
  "erreur explicite « introuvable »",
  /introuvable en base/.test(planMissing.errors[0] ?? ""),
  true,
);

console.log("\n— Homonyme : signalé, jamais deviné —");
const dbHomonym = [
  ...dbAll,
  { ...dbAll[0], studentNumber: "999999" },
];
const planHomonym = planAppointmentImport({ rows, dbStudents: dbHomonym });
check("rapprochés (l'homonyme est écarté)", planHomonym.assignments.length, 118);
check(
  "erreur explicite « plusieurs élèves »",
  planHomonym.errors.some((e) => /plusieurs élèves/.test(e)),
  true,
);

console.log("\n— Créneau non reconnu —");
const badRows = [{ ...rows[0], rawSlot: "12 h 00" }];
const planBad = planAppointmentImport({ rows: badRows, dbStudents: dbAll });
check("rien n'est attribué", planBad.assignments.length, 0);
check(
  "erreur explicite « non reconnu »",
  /non reconnu/.test(planBad.errors[0] ?? ""),
  true,
);

console.log("\n— Doublon : premier créneau conservé, second signalé —");
const dupRows = [rows[0], { ...rows[0], rawSlot: "15 h 00", line: 999 }];
const planDup = planAppointmentImport({ rows: dupRows, dbStudents: dbAll });
check("une seule attribution", planDup.assignments.length, 1);
check("le premier créneau gagne", planDup.assignments[0].slot, normalizeSlot(rows[0].rawSlot));
check("le doublon est signalé", planDup.errors.length, 1);

console.log("\n— Élève sans portable : averti, pas bloqué —");
const dbNoLaptop = dbAll.map((s, i) => (i === 0 ? { ...s, receivesLaptop: false } : s));
const planNoLaptop = planAppointmentImport({ rows, dbStudents: dbNoLaptop });
check("toujours attribué", planNoLaptop.assignments.length, 119);
check("mais averti", planNoLaptop.warnings.length, 1);
check(
  "avertissement explicite",
  /n'apparaîtra PAS/.test(planNoLaptop.warnings[0] ?? ""),
  true,
);

console.log(
  failures === 0
    ? "\n✅ Toutes les vérifications passent.\n"
    : `\n❌ ${failures} vérification(s) en échec.\n`,
);
process.exit(failures === 0 ? 0 : 1);
