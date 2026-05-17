import { prisma } from "@/lib/db";
import { toClientStudent, fmtDate } from "@/lib/mappers";
import { notFound } from "next/navigation";
import StudentScreen from "@/components/screens/StudentScreen";

export const dynamic = "force-dynamic";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = decodeURIComponent(id);
  const student = await prisma.student.findFirst({
    where: { OR: [{ studentNumber: key }, { id: key }] },
    include: {
      deliveries: { where: { type: "LAPTOP" }, include: { operator: true } },
    },
  });
  if (!student) notFound();

  const d = student.deliveries[0];
  const delivery = d
    ? {
        folio: d.folio || `AE-26-${student.studentNumber}`,
        deliveredAt: fmtDate(d.deliveredAt),
        operatorName: d.operator?.fullName || "Opérateur",
      }
    : null;

  return <StudentScreen student={toClientStudent(student)} delivery={delivery} />;
}
