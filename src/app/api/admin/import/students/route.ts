import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/import-parse";
import { pickField } from "@/lib/import-alias";
import { levelFromGrado } from "@/lib/level";
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
  // Niveau du sélecteur : REPLI si une ligne n'a pas de niveau propre (grado).
  const fallbackLevel = (sp.get("level") || "").trim();
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
    level: string;
    email: string | null;
    boxNumber: string | null;
    laptopSerial: string | null;
    laptopModel: string | null;
    chargerSerial: string | null;
    stylusSerial: string | null;
  };
  const valid: Row[] = [];

  rows.forEach((row, i) => {
    const line = i + 2;
    const studentNumber = pickField(row, "student_number");
    const firstName = pickField(row, "first_name");
    const lastName = pickField(row, "last_name");
    const group = pickField(row, "group");
    const email = pickField(row, "email") || null;
    const boxNumber = pickField(row, "box_number") || null;
    const laptopSerial = pickField(row, "laptop_serial") || null;
    const laptopModel = pickField(row, "laptop_model") || null;
    const chargerSerial = pickField(row, "charger_serial") || null;
    const stylusSerial = pickField(row, "stylus_serial") || null;

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
    // Niveau : « Sec 1 » → « 1 » (par ligne), sinon chiffre du groupe, sinon sélecteur.
    let level = levelFromGrado(pickField(row, "level_src"), group);
    if (!["1", "2", "3", "4", "5"].includes(level)) level = fallbackLevel;
    if (!["1", "2", "3", "4", "5"].includes(level)) {
      errors.push(
        `Ligne ${line}: niveau introuvable (${studentNumber}) — choisissez le niveau (Sec 1 à 5) au-dessus.`,
      );
      return;
    }
    valid.push({
      studentNumber,
      firstName,
      lastName,
      group,
      level,
      email,
      boxNumber,
      laptopSerial,
      laptopModel,
      chargerSerial,
      stylusSerial,
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
          level: v.level,
        };
        if (v.email) update.email = v.email;
        if (withLaptop) {
          update.receivesLaptop = true;
          if (v.boxNumber !== null) update.boxNumber = v.boxNumber;
          if (v.laptopSerial !== null) update.laptopSerial = v.laptopSerial;
          if (v.laptopModel !== null) update.laptopModel = v.laptopModel;
          if (v.chargerSerial !== null) update.chargerSerial = v.chargerSerial;
          if (v.stylusSerial !== null) update.stylusSerial = v.stylusSerial;
        }
        if (withLocker) update.receivesLocker = true;

        const create: Record<string, unknown> = {
          studentNumber: v.studentNumber,
          firstName: v.firstName,
          lastName: v.lastName,
          group: v.group,
          level: v.level,
          email: v.email,
        };
        if (withLaptop) {
          create.receivesLaptop = true;
          create.laptopStatus = "PENDING";
          create.boxNumber = v.boxNumber;
          create.laptopSerial = v.laptopSerial;
          create.laptopModel = v.laptopModel;
          create.chargerSerial = v.chargerSerial;
          create.stylusSerial = v.stylusSerial;
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
