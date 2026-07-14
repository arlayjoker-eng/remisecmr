import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { canCasier } from "@/lib/access";
import { NextResponse } from "next/server";

// POST — corriger le casier d'un élève qui en a déjà un (erreur de remise).
// Libère l'ancien casier et attribue le nouveau.
// body: { studentNumber, lockerNumber, binomeStudentNumber? }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canCasier(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  const lockerNumber = String(body?.lockerNumber ?? "").trim();
  const binomeRaw = String(body?.binomeStudentNumber ?? "").trim();

  if (!studentNumber || !lockerNumber) {
    return NextResponse.json(
      { error: "Sélectionnez un casier avant de confirmer." },
      { status: 400 },
    );
  }

  const student = await prisma.student.findUnique({
    where: { studentNumber },
  });
  if (!student) {
    return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
  }

  const oldLocker = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: studentNumber },
        { assignedStudentNumberB: studentNumber },
      ],
    },
  });
  if (!oldLocker) {
    return NextResponse.json(
      { error: "Cet élève n'a pas encore de casier à corriger." },
      { status: 400 },
    );
  }

  const newLocker = await prisma.locker.findUnique({
    where: { number: lockerNumber },
  });
  if (!newLocker) {
    return NextResponse.json(
      { error: `Casier ${lockerNumber} introuvable dans le catalogue.` },
      { status: 404 },
    );
  }

  const sameLocker = newLocker.id === oldLocker.id;
  if (
    !sameLocker &&
    (newLocker.assignedStudentNumberA ||
      newLocker.assignedStudentNumberB ||
      newLocker.status === "DELIVERED")
  ) {
    return NextResponse.json(
      { error: `Le casier ${lockerNumber} est déjà attribué.` },
      { status: 409 },
    );
  }

  // Binôme (optionnel)
  let binome: { studentNumber: string } | null = null;
  if (binomeRaw && binomeRaw !== studentNumber) {
    const b = await prisma.student.findUnique({
      where: { studentNumber: binomeRaw },
    });
    if (!b) {
      return NextResponse.json(
        { error: "Binôme introuvable." },
        { status: 400 },
      );
    }
    binome = { studentNumber: b.studentNumber };
  }

  const oldStudents = [
    oldLocker.assignedStudentNumberA,
    oldLocker.assignedStudentNumberB,
  ].filter(Boolean) as string[];
  const newStudents = [studentNumber, binome?.studentNumber].filter(
    Boolean,
  ) as string[];
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Libérer l'ancien casier (si différent du nouveau)
      if (!sameLocker) {
        await tx.locker.update({
          where: { id: oldLocker.id },
          data: {
            assignedStudentNumberA: null,
            assignedStudentNumberB: null,
            status: "AVAILABLE",
          },
        });
      }
      // 2. Attribuer le nouveau casier
      await tx.locker.update({
        where: { id: newLocker.id },
        data: {
          assignedStudentNumberA: studentNumber,
          assignedStudentNumberB: binome?.studentNumber ?? null,
          status: "DELIVERED",
        },
      });
      // 3. Déplacer la livraison CASIER vers le nouveau casier
      const delivery = await tx.delivery.findFirst({
        where: { lockerId: oldLocker.id, type: "CASIER" },
      });
      if (delivery) {
        await tx.delivery.update({
          where: { id: delivery.id },
          data: { lockerId: newLocker.id, studentId: student.id },
        });
      } else {
        await tx.delivery.create({
          data: {
            type: "CASIER",
            studentId: student.id,
            operatorId: session.user.id as string,
            lockerId: newLocker.id,
            deliveredAt: now,
          },
        });
      }
      // 4. Élèves retirés du casier → nettoyer le cache
      for (const sn of oldStudents) {
        if (!newStudents.includes(sn)) {
          await tx.student.update({
            where: { studentNumber: sn },
            data: {
              assignedLockerNumber: null,
              assignedCombinationCode: null,
              lockerDeliveredAt: null,
            },
          });
        }
      }
      // 5. Élèves actuels → cache vers le nouveau casier
      for (const sn of newStudents) {
        await tx.student.update({
          where: { studentNumber: sn },
          data: {
            assignedLockerNumber: newLocker.number,
            assignedCombinationCode: newLocker.combinationCode,
            lockerDeliveredAt: now,
          },
        });
      }
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Conflit lors du changement de casier. " + (e as Error).message,
      },
      { status: 409 },
    );
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "casier.reassign",
    target: `élève ${studentNumber}`,
    details:
      `casier ${oldLocker.number} → ${newLocker.number}` +
      (binome ? ` · binôme ${binome.studentNumber}` : " · sans binôme"),
  });

  return NextResponse.json({
    ok: true,
    lockerNumber: newLocker.number,
    serialNumber: newLocker.serialNumber || "",
    combinationCode: newLocker.combinationCode,
  });
}
