// Deterministic avatar hue (0-360) from a student's name.
export function hueFromName(first: string, last: string): number {
  const s = `${first} ${last}`.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}

export function folioFor(studentId: string): string {
  return `AE-26-${studentId.slice(-4)}`;
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
