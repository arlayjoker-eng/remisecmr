// Deterministic avatar hue (0-360) from a student's name.
export function hueFromName(first: string, last: string): number {
  const s = `${first} ${last}`.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}

export function folioFor(studentNumber: string): string {
  return `AE-26-${studentNumber}`;
}

// Un folio n'est composé que de lettres, chiffres et tirets. Sert de garde
// anti-« path traversal » avant toute lecture de fichier basée sur le folio.
const FOLIO_RE = /^AE-26-[A-Za-z0-9-]{1,40}$/;
export function isValidFolio(folio: string): boolean {
  return FOLIO_RE.test(folio);
}

export function initialsOf(name: string | null | undefined): string {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

// Domaine courriel de l'école. Un identifiant court sans "@" devient
// identifiant@collegemont-royal.qc.ca — utilisé au login et à la création.
export const SCHOOL_EMAIL_DOMAIN = "collegemont-royal.qc.ca";

export function toSchoolEmail(raw: string): string {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return "";
  return v.includes("@") ? v : `${v}@${SCHOOL_EMAIL_DOMAIN}`;
}
