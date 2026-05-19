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
