// Maps Prisma rows to the plain shapes the screens expect.
import type { Student } from "@prisma/client";
import { hueFromName } from "./util";

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
  assignedCombinationCode: string | null;
  lockerDeliveredAt: string | null;
  color: number;
};

export function toClientStudent(s: Student): ClientStudent {
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
    assignedCombinationCode: s.assignedCombinationCode,
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
