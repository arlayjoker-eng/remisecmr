// Alias d'en-têtes partagés par les importateurs (élèves + portables).
// Permet d'importer AUSSI l'export de cmr-device-manager (colonnes espagnoles,
// séparateur virgule) sans rien changer à cet outil. Les clés canoniques
// anglaises restent valides. Les en-têtes arrivent déjà en minuscules (parseImport).
const ALIASES: Record<string, string[]> = {
  student_number: ["student_number", "numero_fiche", "numéro_fiche", "fiche"],
  first_name: ["first_name", "nombre", "prénom", "prenom"],
  last_name: ["last_name", "apellido", "nom de famille", "nom"],
  email: ["email", "courriel"],
  group: ["group", "grupo", "groupe"],
  box_number: ["box_number", "numero_caja", "numéro_caja", "boîte", "boite", "caja"],
  laptop_serial: ["laptop_serial", "serie_laptop", "série_laptop"],
  laptop_model: ["laptop_model", "modele", "modèle", "modelo"],
  charger_serial: ["charger_serial", "serie_cargador", "série_chargeur", "chargeur"],
  stylus_serial: ["stylus_serial", "serie_stylus", "série_crayon", "crayon", "stylet"],
  // Source du niveau par ligne : « grado » (Sec 1) → chiffre. Sinon repli au sélecteur.
  level_src: ["level", "niveau", "nivel", "grado"],
};

/** Lit un champ canonique en essayant tous ses alias. Renvoie "" si absent. */
export function pickField(
  row: Record<string, string>,
  canonical: keyof typeof ALIASES,
): string {
  for (const key of ALIASES[canonical]) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
