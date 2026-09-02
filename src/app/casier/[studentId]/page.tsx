import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { canCasier } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import CasierScreen from "@/components/screens/CasierScreen";
import { conflictIndex } from "@/lib/locker-conflicts";

export const dynamic = "force-dynamic";

export default async function CasierPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const key = decodeURIComponent(studentId);
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Isolation par mode (CN-002) : l'écran casier expose des combinaisons.
  if (!canCasier(session.user)) redirect("/scan");
  const operatorName = session.user.name || "Opérateur";

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
  // Sécurité (CN-002) : PAS de combinaison ici. Le catalogue ne transporte que
  // n° de casier + n° de série. La combinaison n'est révélée qu'à l'attribution.
  const lockers = await prisma.locker.findMany({
    where: {
      assignedStudentNumberA: null,
      assignedStudentNumberB: null,
      status: "AVAILABLE",
    },
    select: { number: true, serialNumber: true },
    orderBy: { number: "asc" },
  });
  const availableLockers = lockers.map((l) => ({
    number: l.number,
    serialNumber: l.serialNumber || "",
  }));

  // Quelque chose cloche-t-il pour cet élève ? On croise par casier ET par
  // élève : un élève qui doit recevoir un casier et n'en a aucun n'a pas de
  // numéro auquel se raccrocher, et doit être signalé quand même.
  // On avertit sans jamais empêcher la remise.
  const { byNumber, byStudent } = await conflictIndex(prisma);
  const lockerConflicts = [
    ...(existing ? (byNumber.get(existing.number) ?? []) : []),
    ...(byStudent.get(student.studentNumber) ?? []),
  ].filter(
    (c, i, all) =>
      all.findIndex((o) => o.kind === c.kind && o.values === c.values) === i,
  );

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
        petitCasier={student.petitCasier || ""}
        lockerConflicts={lockerConflicts}
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
      petitCasier={student.petitCasier || ""}
      lockerConflicts={lockerConflicts}
    />
  );
}
