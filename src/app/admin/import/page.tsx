import { prisma } from "@/lib/db";
import ImportScreen from "@/components/screens/ImportScreen";

export const dynamic = "force-dynamic";

const EMPTY = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

export default async function ImportPage() {
  const [lapGroups, casGroups, lockerTotal, lockerAvailable] =
    await Promise.all([
      prisma.student.groupBy({
        by: ["level"],
        where: { receivesLaptop: true },
        _count: true,
      }),
      prisma.student.groupBy({
        by: ["level"],
        where: { receivesLocker: true },
        _count: true,
      }),
      prisma.locker.count(),
      prisma.locker.count({
        where: {
          assignedStudentNumberA: null,
          assignedStudentNumberB: null,
          status: "AVAILABLE",
        },
      }),
    ]);

  const toMap = (g: { level: string; _count: number }[]) => {
    const m: Record<string, number> = { ...EMPTY };
    g.forEach((x) => {
      if (x.level in m) m[x.level] = x._count;
    });
    return m;
  };
  const laptopByLevel = toMap(lapGroups);
  const casierByLevel = toMap(casGroups);
  const sum = (m: Record<string, number>) =>
    Object.values(m).reduce((a, b) => a + b, 0);

  return (
    <ImportScreen
      summary={{
        laptopByLevel,
        casierByLevel,
        laptopTotal: sum(laptopByLevel),
        casierTotal: sum(casierByLevel),
        lockerTotal,
        lockerAvailable,
      }}
    />
  );
}
