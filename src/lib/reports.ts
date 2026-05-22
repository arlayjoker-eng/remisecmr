import { prisma } from "@/lib/db";

export type ReportFilters = {
  type?: string; // "LAPTOP" | "CASIER" | ""
  level?: string; // "1".."5" | ""
  group?: string;
  state?: string; // "DELIVERED" | "PENDING" | ""
  from?: string; // YYYY-MM-DD
  to?: string;
};

export type ReportRow = {
  typeKey: "LAPTOP" | "CASIER";
  type: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  group: string;
  level: string;
  laptopModel: string;
  laptopSerial: string;
  boxNumber: string;
  lockerNumber: string;
  combinationCode: string;
  binomeNumber: string;
  binomeName: string;
  petitCasier: string;
  details: string;
  stateKey: "DELIVERED" | "PENDING";
  state: string;
  deliveryDate: Date | null;
  operator: string;
};

function fmt(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDeliveryDate(d: Date | null): string {
  return fmt(d);
}

// Accès aux rapports par utilisateur. Le SUPER_ADMIN voit tout.
export async function getReportAccess(
  userId: string | undefined,
  role: string | undefined,
): Promise<{ laptop: boolean; casier: boolean }> {
  if (role === "SUPER_ADMIN") return { laptop: true, casier: true };
  if (!userId) return { laptop: false, casier: false };
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessLaptopReports: true, accessCasierReports: true },
  });
  return {
    laptop: !!u?.accessLaptopReports,
    casier: !!u?.accessCasierReports,
  };
}

// Restreint le type demandé à ce que l'utilisateur peut voir.
export function clampReportType(
  requested: string,
  access: { laptop: boolean; casier: boolean },
): string {
  if (access.laptop && access.casier) {
    return requested === "LAPTOP" || requested === "CASIER" ? requested : "";
  }
  if (access.laptop) return "LAPTOP";
  if (access.casier) return "CASIER";
  return "NONE"; // aucun accès → aucun résultat
}

export type LevelProgress = {
  level: string;
  laptopTotal: number;
  laptopDone: number;
  casierTotal: number;
  casierDone: number;
};

export async function getReportData(filters: ReportFilters): Promise<{
  rows: ReportRow[];
  stats: { total: number; delivered: number; pending: number };
  groups: string[];
  byLevel: LevelProgress[];
}> {
  const students = await prisma.student.findMany({
    include: {
      deliveries: { include: { operator: true } },
      lockerAsA: { include: { studentB: true } },
      lockerAsB: { include: { studentA: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const groups = Array.from(new Set(students.map((s) => s.group)))
    .filter(Boolean)
    .sort();

  const all: ReportRow[] = [];

  for (const s of students) {
    // ─── ligne PORTABLE ──────────────────────────────────────
    if (s.receivesLaptop) {
      const d = s.deliveries.find((x) => x.type === "LAPTOP") || null;
      all.push({
        typeKey: "LAPTOP",
        type: "Portable",
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email || "",
        group: s.group,
        level: s.level,
        laptopModel: s.laptopModel || "",
        laptopSerial: s.laptopSerial || "",
        boxNumber: s.boxNumber || "",
        lockerNumber: "",
        combinationCode: "",
        binomeNumber: "",
        binomeName: "",
        petitCasier: "",
        details: s.laptopModel || s.laptopSerial || "—",
        stateKey: s.laptopStatus === "DELIVERED" ? "DELIVERED" : "PENDING",
        state: s.laptopStatus === "DELIVERED" ? "Livré" : "En attente",
        deliveryDate: d ? d.deliveredAt : null,
        operator: d?.operator?.fullName || "",
      });
    }
    // ─── ligne CASIER ────────────────────────────────────────
    if (s.receivesLocker) {
      const d = s.deliveries.find((x) => x.type === "CASIER") || null;
      const locker = s.lockerAsA ?? s.lockerAsB;
      // binôme = l'autre élève du casier (selon que cet élève est A ou B)
      const b = s.lockerAsA
        ? s.lockerAsA.studentB
        : s.lockerAsB
          ? s.lockerAsB.studentA
          : null;
      all.push({
        typeKey: "CASIER",
        type: "Casier",
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email || "",
        group: s.group,
        level: s.level,
        laptopModel: "",
        laptopSerial: "",
        boxNumber: "",
        lockerNumber: locker?.number || s.assignedLockerNumber || "",
        combinationCode:
          locker?.combinationCode || s.assignedCombinationCode || "",
        binomeNumber: b?.studentNumber || "",
        binomeName: b ? `${b.firstName} ${b.lastName}` : "",
        petitCasier: s.petitCasier || "",
        details: locker
          ? `${locker.number} · ${locker.combinationCode}`
          : s.assignedLockerNumber || "—",
        stateKey: s.lockerDeliveredAt ? "DELIVERED" : "PENDING",
        state: s.lockerDeliveredAt ? "Livré" : "En attente",
        deliveryDate: d ? d.deliveredAt : s.lockerDeliveredAt || null,
        operator: d?.operator?.fullName || "",
      });
    }
  }

  // ─── appliquer les filtres ─────────────────────────────────
  const fromD = filters.from ? new Date(filters.from + "T00:00:00") : null;
  const toD = filters.to ? new Date(filters.to + "T23:59:59") : null;
  const dateActive = !!(fromD || toD);

  const rows = all.filter((r) => {
    if (filters.type && r.typeKey !== filters.type) return false;
    if (filters.level && r.level !== filters.level) return false;
    if (filters.group && r.group !== filters.group) return false;
    if (filters.state && r.stateKey !== filters.state) return false;
    if (dateActive) {
      if (!r.deliveryDate) return false;
      if (fromD && r.deliveryDate < fromD) return false;
      if (toD && r.deliveryDate > toD) return false;
    }
    return true;
  });

  const delivered = rows.filter((r) => r.stateKey === "DELIVERED").length;

  // Progression par niveau — calculée sur l'ensemble (hors filtres).
  const byLevel: LevelProgress[] = ["1", "2", "3", "4", "5"].map((lvl) => {
    const lap = all.filter((r) => r.typeKey === "LAPTOP" && r.level === lvl);
    const cas = all.filter((r) => r.typeKey === "CASIER" && r.level === lvl);
    return {
      level: lvl,
      laptopTotal: lap.length,
      laptopDone: lap.filter((r) => r.stateKey === "DELIVERED").length,
      casierTotal: cas.length,
      casierDone: cas.filter((r) => r.stateKey === "DELIVERED").length,
    };
  });

  return {
    rows,
    stats: {
      total: rows.length,
      delivered,
      pending: rows.length - delivered,
    },
    groups,
    byLevel,
  };
}
