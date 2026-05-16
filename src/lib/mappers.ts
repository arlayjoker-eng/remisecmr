// Maps Prisma rows to the plain object shapes the ported screens expect.
import type { Student, Locker, Delivery } from "@prisma/client";

export type ClientStudent = {
  id: string;
  code: string;
  first: string;
  last: string;
  group: string;
  box: string;
  device: string;
  serial: string;
  accessories: string[];
  tutor: string;
  tutorPhone: string;
  paid: boolean;
  status: string;
  color: number;
  deliveredAt: string | null;
};

export type ClientLocker = {
  number: string;
  code: string;
  brand: string;
  aisle: string;
  status: string;
  binome: string | null;
  deliveredAt: string | null;
};

export function fmtTime(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseAccessories(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return raw ? [raw] : [];
  }
}

export function toClientStudent(
  s: Student & { delivery?: Delivery | null },
): ClientStudent {
  return {
    id: s.id,
    code: s.code,
    first: s.firstName,
    last: s.lastName,
    group: s.groupName,
    box: s.box,
    device: s.device,
    serial: s.serial,
    accessories: parseAccessories(s.accessories),
    tutor: s.tutorName,
    tutorPhone: s.tutorPhone,
    paid: s.paid,
    status: s.laptopStatus,
    color: s.avatarHue,
    deliveredAt: s.delivery ? fmtTime(s.delivery.deliveredAt) : null,
  };
}

export function toClientLocker(l: Locker): ClientLocker {
  return {
    number: l.number,
    code: l.code,
    brand: l.brand,
    aisle: l.aisle,
    status: l.status,
    binome: l.binomeId ?? null,
    deliveredAt: fmtTime(l.deliveredAt),
  };
}

// Builds the { [ownerId]: ClientLocker } object the CasierScreen consumes.
export function lockerMap(lockers: Locker[]): Record<string, ClientLocker> {
  const map: Record<string, ClientLocker> = {};
  for (const l of lockers) map[l.ownerId] = toClientLocker(l);
  return map;
}
