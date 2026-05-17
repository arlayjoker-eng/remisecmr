import { auth } from "@/auth";
import { getReportData, fmtDeliveryDate } from "@/lib/reports";
import ReportsScreen from "@/components/screens/ReportsScreen";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const filters = {
    type: sp.type || "",
    level: sp.level || "",
    group: sp.group || "",
    state: sp.state || "",
    from: sp.from || "",
    to: sp.to || "",
  };
  const { rows, stats, groups } = await getReportData(filters);

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
  }));

  return (
    <ReportsScreen
      rows={clientRows}
      stats={stats}
      groups={groups}
      filters={filters}
      role={session?.user?.role || "OPERATOR"}
    />
  );
}
