import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { notFound } from "next/navigation";
import CasierScreen from "@/components/screens/CasierScreen";

export const dynamic = "force-dynamic";

export default async function CasierPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const key = decodeURIComponent(studentId);
  const session = await auth();
  const operatorName = session?.user?.name || "Opérateur";

  const student = await prisma.student.findFirst({
    where: { OR: [{ studentNumber: key }, { id: key }] },
  });
  if (!student) notFound();

  // L'élève a-t-il déjà un casier (titulaire ou binôme) ?
  const existing = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: student.studentNumber },
        { assignedStudentNumberB: student.studentNumber },
      ],
    },
    include: { studentA: true, studentB: true },
  });

  // Casiers disponibles du catalogue — pour l'attribution ET la correction.
  const lockers = await prisma.locker.findMany({
    where: {
      assignedStudentNumberA: null,
      assignedStudentNumberB: null,
      status: "AVAILABLE",
    },
    select: { number: true, serialNumber: true, combinationCode: true },
    orderBy: { number: "asc" },
  });
  const availableLockers = lockers.map((l) => ({
    number: l.number,
    serialNumber: l.serialNumber || "",
    combinationCode: l.combinationCode,
  }));

  if (existing) {
    const isA = existing.assignedStudentNumberA === student.studentNumber;
    const partner = isA ? existing.studentB : existing.studentA;
    return (
      <CasierScreen
        student={toClientStudent(student)}
        mode="done"
        assignedLocker={{
          number: existing.number,
          serialNumber: existing.serialNumber || "",
          combinationCode: existing.combinationCode,
        }}
        binome={partner ? toClientStudent(partner) : null}
        availableLockers={availableLockers}
        operatorName={operatorName}
      />
    );
  }

  return (
    <CasierScreen
      student={toClientStudent(student)}
      mode="assign"
      assignedLocker={null}
      binome={null}
      availableLockers={availableLockers}
      operatorName={operatorName}
    />
  );
}
