// Maps Prisma rows to the plain shapes the screens expect.
import type { Prisma, Student } from "@prisma/client";
import { hueFromName } from "./util";

// Sélection Prisma partagée : la SEULE liste de colonnes qui a le droit
// d'arriver au navigateur. Exclut explicitement assignedCombinationCode,
// assignedLockerNumber sensibles ? non — le numéro de casier est ok, mais la
// combinaison et petitCasier restent côté serveur.
export const studentClientSelect = {
  id: true,
  studentNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  group: true,
  level: true,
  boxNumber: true,
  laptopSerial: true,
  laptopModel: true,
  laptopStatus: true,
  receivesLaptop: true,
  receivesLocker: true,
  assignedLockerNumber: true,
  lockerDeliveredAt: true,
} satisfies Prisma.StudentSelect;

// Le type d'une ligne réduite à cette sélection.
type StudentClientRow = Pick<Student, keyof typeof studentClientSelect>;

export type ClientStudent = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  group: string;
  level: string;
  boxNumber: string | null;
  laptopSerial: string | null;
  laptopModel: string | null;
  laptopStatus: string;
  receivesLaptop: boolean;
  receivesLocker: boolean;
  assignedLockerNumber: string | null;
  // NOTE sécurité (CN-002) : la combinaison du cadenas ne fait PAS partie de
  // ce DTO. Elle ne doit jamais transiter par le navigateur en bloc ni dans le
  // flux « laptop ». Elle est servie une par une, au moment de la remise, via
  // l'endpoint casier authentifié + journalisé.
  lockerDeliveredAt: string | null;
  color: number;
};

export function toClientStudent(s: StudentClientRow): ClientStudent {
  return {
    id: s.id,
    studentNumber: s.studentNumber,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    group: s.group,
    level: s.level,
    boxNumber: s.boxNumber,
    laptopSerial: s.laptopSerial,
    laptopModel: s.laptopModel,
    laptopStatus: s.laptopStatus,
    receivesLaptop: s.receivesLaptop,
    receivesLocker: s.receivesLocker,
    assignedLockerNumber: s.assignedLockerNumber,
    lockerDeliveredAt: s.lockerDeliveredAt
      ? s.lockerDeliveredAt.toISOString()
      : null,
    color: hueFromName(s.firstName, s.lastName),
  };
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
