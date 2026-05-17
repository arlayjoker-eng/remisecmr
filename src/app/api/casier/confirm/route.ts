import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST — confirmer la remise d'un casier (pas de signature, pas de PDF).
// body: { studentNumber, binomeStudentNumber? }
//   - binomeStudentNumber présent  → définit le binôme (ou le retire si vide)
//   - binomeStudentNumber absent   → binôme inchangé
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  if (!studentNumber) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const hasBinomeField =
    body && Object.prototype.hasOwnProperty.call(body, "binomeStudentNumber");
  const binomeRaw = hasBinomeField
    ? String(body.binomeStudentNumber ?? "").trim()
    : null;

  const locker = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: studentNumber },
        { assignedStudentNumberB: studentNumber },
      ],
    },
  });
  if (!locker || !locker.assignedStudentNumberA) {
    return NextResponse.json({ error: "no_locker" }, { status: 404 });
  }

  const owner = await prisma.student.findUnique({
    where: { studentNumber: locker.assignedStudentNumberA },
  });
  if (!owner) {
    return NextResponse.json({ error: "owner_not_found" }, { status: 404 });
  }

  const existing = await prisma.delivery.findUnique({
    where: { studentId_type: { studentId: owner.id, type: "CASIER" } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  // résoudre le binôme
  let newBinomeNumber: string | null = locker.assignedStudentNumberB;
  let binomeStudentId: string | null = null;
  if (hasBinomeField) {
    if (binomeRaw && binomeRaw !== owner.studentNumber) {
      const binome = await prisma.student.findUnique({
        where: { studentNumber: binomeRaw },
      });
      if (!binome) {
        return NextResponse.json(
          { error: "Binôme introuvable." },
          { status: 400 },
        );
      }
      newBinomeNumber = binome.studentNumber;
      binomeStudentId = binome.id;
    } else {
      newBinomeNumber = null;
    }
  } else if (locker.assignedStudentNumberB) {
    const b = await prisma.student.findUnique({
      where: { studentNumber: locker.assignedStudentNumberB },
    });
    binomeStudentId = b?.id ?? null;
  }

  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.locker.update({
        where: { id: locker.id },
        data: { status: "DELIVERED", assignedStudentNumberB: newBinomeNumber },
      }),
      prisma.student.update({
        where: { id: owner.id },
        data: { lockerDeliveredAt: now },
      }),
      ...(binomeStudentId
        ? [
            prisma.student.update({
              where: { id: binomeStudentId },
              data: { lockerDeliveredAt: now },
            }),
          ]
        : []),
      prisma.delivery.create({
        data: {
          type: "CASIER",
          studentId: owner.id,
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
          "Conflit : ce binôme est déjà associé à un autre casier. " +
          (e as Error).message,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
