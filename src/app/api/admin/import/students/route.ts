import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/import-parse";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST — import unifié de la liste des élèves.
// Une seule liste : on coche ce qu'ils reçoivent (portable et/ou casier).
// Query: ?level=1..5 & withLaptop=0|1 & withLocker=0|1
// CSV / Excel attendus : student_number, first_name, last_name, group
//   + email, box_number, laptop_serial, laptop_model (optionnels)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const level = (sp.get("level") || "").trim();
  if (!["1", "2", "3", "4", "5"].includes(level)) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        imported: 0,
        errors: ["Sélectionnez le niveau (Sec 1 à 5) avant d'importer."],
      },
      { status: 422 },
    );
  }
  const withLaptop = sp.get("withLaptop") !== "0";
  const withLocker = sp.get("withLocker") !== "0";
  if (!withLaptop && !withLocker) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        imported: 0,
        errors: [
          "Cochez au moins « Reçoivent un portable » ou « Reçoivent un casier ».",
        ],
      },
      { status: 422 },
    );
  }

  const rows = await parseImport(req);
  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        imported: 0,
        errors: ["Fichier vide ou sans données."],
      },
      { status: 422 },
    );
  }

  const errors: string[] = [];
  type Row = {
    studentNumber: string;
    firstName: string;
    lastName: string;
    group: string;
    email: string | null;
    boxNumber: string | null;
    laptopSerial: string | null;
    laptopModel: string | null;
  };
  const valid: Row[] = [];

  rows.forEach((row, i) => {
    const line = i + 2;
    const studentNumber = (row.student_number || "").trim();
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    const group = (row.group || "").trim();
    const email = (row.email || "").trim() || null;
    const boxNumber = (row.box_number || "").trim() || null;
    const laptopSerial = (row.laptop_serial || "").trim() || null;
    const laptopModel = (row.laptop_model || "").trim() || null;

    if (!studentNumber) {
      errors.push(`Ligne ${line}: numéro d'élève manquant`);
      return;
    }
    if (!firstName || !lastName) {
      errors.push(`Ligne ${line}: nom ou prénom manquant (${studentNumber})`);
      return;
    }
    if (!group) {
      errors.push(`Ligne ${line}: groupe manquant (${studentNumber})`);
      return;
    }
    valid.push({
      studentNumber,
      firstName,
      lastName,
      group,
      email,
      boxNumber,
      laptopSerial,
      laptopModel,
    });
  });

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, total: rows.length, imported: 0, errors },
      { status: 422 },
    );
  }

  try {
    await prisma.$transaction(
      valid.map((v) => {
        const update: Record<string, unknown> = {
          firstName: v.firstName,
          lastName: v.lastName,
          group: v.group,
          level,
        };
        if (v.email) update.email = v.email;
        if (withLaptop) {
          update.receivesLaptop = true;
          if (v.boxNumber !== null) update.boxNumber = v.boxNumber;
          if (v.laptopSerial !== null) update.laptopSerial = v.laptopSerial;
          if (v.laptopModel !== null) update.laptopModel = v.laptopModel;
        }
        if (withLocker) update.receivesLocker = true;

        const create: Record<string, unknown> = {
          studentNumber: v.studentNumber,
          firstName: v.firstName,
          lastName: v.lastName,
          group: v.group,
          level,
          email: v.email,
        };
        if (withLaptop) {
          create.receivesLaptop = true;
          create.laptopStatus = "PENDING";
          create.boxNumber = v.boxNumber;
          create.laptopSerial = v.laptopSerial;
          create.laptopModel = v.laptopModel;
        }
        if (withLocker) create.receivesLocker = true;

        return prisma.student.upsert({
          where: { studentNumber: v.studentNumber },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          update: update as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: create as any,
        });
      }),
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        total: rows.length,
        imported: 0,
        errors: [
          `Échec de l'import (transaction annulée): ${(e as Error).message}`,
        ],
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    imported: valid.length,
    errors: [],
  });
}

// DELETE — efface toute la liste des élèves (et leurs livraisons +
// assignations de casiers). Le catalogue des casiers est conservé.
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const before = await prisma.student.count();
  await prisma.$transaction([
    prisma.delivery.deleteMany({}),
    prisma.locker.updateMany({
      data: {
        assignedStudentNumberA: null,
        assignedStudentNumberB: null,
        status: "AVAILABLE",
      },
    }),
    prisma.student.deleteMany({}),
  ]);
  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "import.delete",
    target: "liste des élèves",
    details: `${before} élève(s) effacé(s)`,
  });
  return NextResponse.json({ ok: true, deleted: before });
}
