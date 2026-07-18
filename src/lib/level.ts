/**
 * Niveau attendu par remisecmr : "1".."5".
 * cmr-device-manager envoie grado = "Sec 1" et grupo = "SEC-110" : on prend le
 * premier chiffre du grado, puis du grupo en secours.
 */
export function levelFromGrado(grado: string, grupo: string): string {
  const fromGrado = String(grado ?? "").match(/\d/);
  if (fromGrado) return fromGrado[0];
  const fromGrupo = String(grupo ?? "").match(/\d/);
  if (fromGrupo) return fromGrupo[0];
  return String(grado ?? "").trim() || String(grupo ?? "").trim();
}
