import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { canCasier } from "@/lib/access";
import { NextResponse } from "next/server";

// POST — confirmer l'attribution d'un casier choisi au scan (pas de signature).
// body: { studentNumber, lockerNumber, binomeStudentNumber? }
//   - studentNumber       → l'élève scanné, devient titulaire (A) du casier
//   - lockerNumber        → casier choisi dans le catalogue
//   - binomeStudentNumber → 2e élève du casier (optionnel)
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

  // L'élève a-t-il déjà un casier ?
  const existingLocker = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: studentNumber },
        { assignedStudentNumberB: studentNumber },
      ],
    },
  });
  if (existingLocker) {
    return NextResponse.json({
      ok: true,
      already: true,
      lockerNumber: existingLocker.number,
      serialNumber: existingLocker.serialNumber || "",
      combinationCode: existingLocker.combinationCode,
    });
  }

  const locker = await prisma.locker.findUnique({
    where: { number: lockerNumber },
  });
  if (!locker) {
    return NextResponse.json(
      { error: `Casier ${lockerNumber} introuvable dans le catalogue.` },
      { status: 404 },
    );
  }
  if (
    locker.assignedStudentNumberA ||
    locker.assignedStudentNumberB ||
    locker.status === "DELIVERED"
  ) {
    return NextResponse.json(
      { error: `Le casier ${lockerNumber} est déjà attribué.` },
      { status: 409 },
    );
  }

  // Binôme (optionnel)
  let binome: { id: string; studentNumber: string } | null = null;
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
    const bLocker = await prisma.locker.findFirst({
      where: {
        OR: [
          { assignedStudentNumberA: binomeRaw },
          { assignedStudentNumberB: binomeRaw },
        ],
      },
    });
    if (bLocker) {
      return NextResponse.json(
        { error: "Le binôme a déjà un casier." },
        { status: 409 },
      );
    }
    binome = { id: b.id, studentNumber: b.studentNumber };
  }

  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.locker.update({
        where: { id: locker.id },
        data: {
          status: "DELIVERED",
          assignedStudentNumberA: student.studentNumber,
          assignedStudentNumberB: binome?.studentNumber ?? null,
        },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: {
          lockerDeliveredAt: now,
          assignedLockerNumber: locker.number,
          assignedCombinationCode: locker.combinationCode,
        },
      }),
      ...(binome
        ? [
            prisma.student.update({
              where: { id: binome.id },
              data: {
                lockerDeliveredAt: now,
                assignedLockerNumber: locker.number,
                assignedCombinationCode: locker.combinationCode,
              },
            }),
          ]
        : []),
      prisma.delivery.create({
        data: {
          type: "CASIER",
          studentId: student.id,
          operatorId: session.user.id as string,
          lockerId: locker.id,
          deliveredAt: now,
        },
      }),
    ]);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Conflit lors de l'attribution du casier. " + (e as Error).message,
      },
      { status: 409 },
    );
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "casier.remise",
    target: `casier ${locker.number}`,
    details:
      `attribué à l'élève ${student.studentNumber}` +
      (binome ? ` + binôme ${binome.studentNumber}` : " (sans binôme)"),
  });

  // La combinaison n'est renvoyée qu'ICI, au moment précis de l'attribution.
  return NextResponse.json({
    ok: true,
    lockerNumber: locker.number,
    serialNumber: locker.serialNumber || "",
    combinationCode: locker.combinationCode,
  });
}
