import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST — modifier seulement le binôme d'un casier déjà attribué (correction).
// body: { studentNumber, binomeStudentNumber? }
//   studentNumber       → élève déjà sur le casier (scanned)
//   binomeStudentNumber → nouveau binôme (vide = retirer le binôme actuel)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  const binomeRaw = String(body?.binomeStudentNumber ?? "").trim();
  if (!studentNumber) {
    return NextResponse.json(
      { error: "Données manquantes." },
      { status: 400 },
    );
  }

  const locker = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: studentNumber },
        { assignedStudentNumberB: studentNumber },
      ],
    },
  });
  if (!locker) {
    return NextResponse.json(
      { error: "Cet élève n'a pas de casier." },
      { status: 400 },
    );
  }

  const isA = locker.assignedStudentNumberA === studentNumber;
  const oldPartnerSn = isA
    ? locker.assignedStudentNumberB
    : locker.assignedStudentNumberA;

  // Résoudre le nouveau binôme (s'il y en a un)
  let newPartner: { studentNumber: string } | null = null;
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
    // Vérifier qu'il n'est pas déjà sur un autre casier
    const bLocker = await prisma.locker.findFirst({
      where: {
        OR: [
          { assignedStudentNumberA: binomeRaw },
          { assignedStudentNumberB: binomeRaw },
        ],
      },
    });
    if (bLocker && bLocker.id !== locker.id) {
      return NextResponse.json(
        { error: "Ce binôme est déjà sur un autre casier." },
        { status: 409 },
      );
    }
    newPartner = { studentNumber: b.studentNumber };
  }

  // Aucun changement
  if (oldPartnerSn === (newPartner?.studentNumber ?? null)) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le créneau opposé au student scanné
      await tx.locker.update({
        where: { id: locker.id },
        data: isA
          ? { assignedStudentNumberB: newPartner?.studentNumber ?? null }
          : { assignedStudentNumberA: newPartner?.studentNumber ?? null },
      });
      // 2. Ancien binôme retiré → effacer son cache
      if (oldPartnerSn && oldPartnerSn !== newPartner?.studentNumber) {
        await tx.student.update({
          where: { studentNumber: oldPartnerSn },
          data: {
            assignedLockerNumber: null,
            assignedCombinationCode: null,
            lockerDeliveredAt: null,
          },
        });
      }
      // 3. Nouveau binôme → cache vers ce casier
      if (newPartner) {
        await tx.student.update({
          where: { studentNumber: newPartner.studentNumber },
          data: {
            assignedLockerNumber: locker.number,
            assignedCombinationCode: locker.combinationCode,
            lockerDeliveredAt: now,
          },
        });
      }
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Conflit lors de la mise à jour du binôme. " + (e as Error).message,
      },
      { status: 409 },
    );
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "casier.binome.update",
    target: `casier ${locker.number}`,
    details: `binôme : ${oldPartnerSn ?? "(aucun)"} → ${newPartner?.studentNumber ?? "(aucun)"}`,
  });

  return NextResponse.json({ ok: true });
}
