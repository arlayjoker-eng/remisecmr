// Créneaux des rendez-vous de la rentrée — source unique de vérité.
//
// Ce module est volontairement SANS dépendance : il est importé aussi bien par
// l'import Excel (serveur) que par l'écran de réception (« use client »).
// Y ajouter une dépendance lourde (ExcelJS, Prisma…) la ferait entrer dans le
// paquet envoyé au navigateur.

/** Les 12 créneaux de 30 min (pause du midi entre 11h30 et 13h00). */
export const APPOINTMENT_SLOTS = [
  "8h30",
  "9h00",
  "9h30",
  "10h00",
  "10h30",
  "11h00",
  "11h30",
  "13h00",
  "13h30",
  "14h00",
  "14h30",
  "15h00",
] as const;

export type AppointmentSlot = (typeof APPOINTMENT_SLOTS)[number];

const SLOT_SET: ReadonlySet<string> = new Set(APPOINTMENT_SLOTS);

/**
 * Ramène l'écriture de la feuille au créneau canonique : « 8 h 30 », « 8h30 »,
 * « 08:30 » → « 8h30 ». Renvoie null si ce n'est pas un des 12 créneaux — on
 * préfère signaler une heure inattendue plutôt que de la deviner.
 */
export function normalizeSlot(raw: string): AppointmentSlot | null {
  const m = String(raw ?? "")
    .trim()
    .match(/^(\d{1,2})\s*[h:]\s*(\d{2})$/i);
  if (!m) return null;
  const candidate = `${Number(m[1])}h${m[2]}`;
  return SLOT_SET.has(candidate) ? (candidate as AppointmentSlot) : null;
}
