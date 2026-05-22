import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// PATCH — édition rapide d'un casier depuis /reports.
// Champs acceptés (tous facultatifs) :
//   casier       → Locker.number
//   code         → Locker.combinationCode
//   binomeNumber → binôme de l'élève (slot opposé dans le casier)
//   petitCasier  → Student.petitCasier (saisie manuelle, par élève)
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ studentNumber: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "STAFF_MANAGER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { studentNumber } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const casier =
    body.casier !== undefined ? String(body.casier).trim() : undefined;
  const code = body.code !== undefined ? String(body.code).trim() : undefined;
  const binomeNumber =
    body.binomeNumber !== undefined
      ? String(body.binomeNumber).trim()
      : undefined;
  const petitCasier =
    body.petitCasier !== undefined
      ? String(body.petitCasier).trim()
      : undefined;

  const student = await prisma.student.findUnique({
    where: { studentNumber },
  });
  if (!student) {
    return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
  }

  const locker = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: studentNumber },
        { assignedStudentNumberB: studentNumber },
      ],
    },
  });

  const wantsLockerEdit =
    casier !== undefined || code !== undefined || binomeNumber !== undefined;

  if (wantsLockerEdit && !locker) {
    return NextResponse.json(
      {
        error:
          "Aucun casier assigné à cet élève. Scannez d'abord depuis le kiosk.",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Petit casier — propriété individuelle de l'élève
      if (petitCasier !== undefined) {
        await tx.student.update({
          where: { studentNumber },
          data: { petitCasier: petitCasier || null },
        });
      }

      if (!locker) return;

      // 2. Préparer la mise à jour du locker
      const lockerData: {
        number?: string;
        combinationCode?: string;
        assignedStudentNumberA?: string | null;
        assignedStudentNumberB?: string | null;
      } = {};

      if (casier !== undefined && casier) {
        lockerData.number = casier;
      }
      if (code !== undefined) {
        lockerData.combinationCode = code;
      }

      if (binomeNumber !== undefined) {
        const newBinome = binomeNumber || null;
        if (newBinome) {
          if (newBinome === studentNumber) {
            throw new Error("Le binôme ne peut pas être l'élève lui-même.");
          }
          const target = await tx.student.findUnique({
            where: { studentNumber: newBinome },
          });
          if (!target) {
            throw new Error(`Binôme introuvable : ${newBinome}`);
          }
        }
        const isA = locker.assignedStudentNumberA === studentNumber;
        if (isA) {
          lockerData.assignedStudentNumberB = newBinome;
        } else {
          lockerData.assignedStudentNumberA = newBinome;
        }
      }

      const oldStudents = [
        locker.assignedStudentNumberA,
        locker.assignedStudentNumberB,
      ].filter(Boolean) as string[];

      await tx.locker.update({
        where: { id: locker.id },
        data: lockerData,
      });

      const updated = await tx.locker.findUnique({
        where: { id: locker.id },
      });
      if (!updated) return;

      const newStudents = [
        updated.assignedStudentNumberA,
        updated.assignedStudentNumberB,
      ].filter(Boolean) as string[];

      // 3. Élèves retirés du casier → nettoyer les champs cache
      for (const sn of oldStudents) {
        if (!newStudents.includes(sn)) {
          await tx.student.update({
            where: { studentNumber: sn },
            data: {
              assignedLockerNumber: null,
              assignedCombinationCode: null,
            },
          });
        }
      }
      // 4. Élèves actuels → propager les champs cache (numéro + code)
      for (const sn of newStudents) {
        await tx.student.update({
          where: { studentNumber: sn },
          data: {
            assignedLockerNumber: updated.number,
            assignedCombinationCode: updated.combinationCode,
          },
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur de mise à jour.";
    if (/Unique constraint/i.test(msg)) {
      return NextResponse.json(
        { error: "Casier ou binôme déjà utilisé par un autre élève." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const changes: string[] = [];
  if (casier !== undefined) changes.push(`casier→${casier || "(vide)"}`);
  if (code !== undefined) changes.push(`code→${code || "(vide)"}`);
  if (binomeNumber !== undefined)
    changes.push(`binôme→${binomeNumber || "(aucun)"}`);
  if (petitCasier !== undefined)
    changes.push(`petit casier→${petitCasier || "(vide)"}`);
  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || session.user.email || "?",
    action: "casier.edit",
    target: `élève ${studentNumber}`,
    details: changes.join(" · ") || "aucun changement",
  });

  return NextResponse.json({ ok: true });
}
