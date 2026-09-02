import { auth } from "@/auth";
import {
  getReportData,
  fmtDeliveryDate,
  getReportAccess,
  clampReportType,
} from "@/lib/reports";
import ReportsScreen from "@/components/screens/ReportsScreen";
import { prisma } from "@/lib/db";
import { conflictsByNumber } from "@/lib/locker-conflicts";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const sp = await searchParams;

  // Accès aux rapports — restreint le type selon l'utilisateur.
  const access = await getReportAccess(
    session?.user?.id,
    session?.user?.role,
  );
  const effectiveType = clampReportType(sp.type || "", access);

  const filters = {
    type: effectiveType === "NONE" ? "" : effectiveType,
    level: sp.level || "",
    group: sp.group || "",
    state: sp.state || "",
    from: sp.from || "",
    to: sp.to || "",
  };
  const { rows, stats, groups, byLevel } = await getReportData({
    ...filters,
    type: effectiveType,
  });

  // Contradictions relevées sur les casiers : la liste les signale en rouge.
  const conflicts = await conflictsByNumber(prisma);

  const clientRows = rows.map((r) => ({
    typeKey: r.typeKey,
    type: r.type,
    studentNumber: r.studentNumber,
    name: `${r.firstName} ${r.lastName}`,
    group: r.group,
    level: r.level,
    details: r.details,
    state: r.state,
    stateKey: r.stateKey,
    deliveryDate: fmtDeliveryDate(r.deliveryDate),
    operator: r.operator,
    binomeName: r.binomeName,
    binomeNumber: r.binomeNumber,
    lockerNumber: r.lockerNumber,
    combinationCode: r.combinationCode,
    petitCasier: r.petitCasier,
    conflicts:
      r.typeKey === "CASIER" && r.lockerNumber
        ? (conflicts.get(r.lockerNumber) ?? [])
        : [],
  }));

  return (
    <ReportsScreen
      rows={clientRows}
      stats={stats}
      groups={groups}
      filters={filters}
      role={session?.user?.role || "OPERATOR"}
      access={access}
      byLevel={byLevel}
    />
  );
}
