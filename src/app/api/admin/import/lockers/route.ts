import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import Papa from "papaparse";

// POST — import lockers.csv (CASIER list). SUPER_ADMIN only.
// Columns: student_number,first_name,last_name,group,level,locker_number,combination_code
// Atomic: upsert élève + upsert Locker dans une seule transaction.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const csv = await req.text();
  if (!csv.trim()) {
    return NextResponse.json(
      { ok: false, total: 0, imported: 0, errors: ["Fichier vide."] },
      { status: 422 },
    );
  }

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/^﻿/, ""),
  });
  const rows = parsed.data;
  const errors: string[] = [];
  const valid: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    group: string;
    level: string;
    lockerNumber: string;
    combinationCode: string;
  }[] = [];

  rows.forEach((row, i) => {
    const line = i + 2;
    const studentNumber = (row.student_number || "").trim();
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    const group = (row.group || "").trim();
    const level = (row.level || "").trim();
    const lockerNumber = (row.locker_number || "").trim();
    const combinationCode = (row.combination_code || "").trim();

    if (!studentNumber) {
      errors.push(`Ligne ${line}: numéro d'élève manquant`);
      return;
    }
    if (!firstName || !lastName) {
      errors.push(`Ligne ${line}: nom ou prénom manquant (${studentNumber})`);
      return;
    }
    if (!group || !level) {
      errors.push(`Ligne ${line}: groupe ou niveau manquant (${studentNumber})`);
      return;
    }
    if (!lockerNumber) {
      errors.push(`Ligne ${line}: numéro de casier manquant (${studentNumber})`);
      return;
    }
    if (!combinationCode) {
      errors.push(`Ligne ${line}: code du cadenas manquant (${studentNumber})`);
      return;
    }
    valid.push({
      studentNumber,
      firstName,
      lastName,
      group,
      level,
      lockerNumber,
      combinationCode,
    });
  });

  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, total: rows.length, imported: 0, errors },
      { status: 422 },
    );
  }

  try {
    const ops = [];
    for (const v of valid) {
      ops.push(
        prisma.student.upsert({
          where: { studentNumber: v.studentNumber },
          update: {
            firstName: v.firstName,
            lastName: v.lastName,
            group: v.group,
            level: v.level,
            receivesLocker: true,
            assignedLockerNumber: v.lockerNumber,
            assignedCombinationCode: v.combinationCode,
          },
          create: {
            studentNumber: v.studentNumber,
            firstName: v.firstName,
            lastName: v.lastName,
            group: v.group,
            level: v.level,
            receivesLocker: true,
            assignedLockerNumber: v.lockerNumber,
            assignedCombinationCode: v.combinationCode,
          },
        }),
      );
      ops.push(
        prisma.locker.upsert({
          where: { number: v.lockerNumber },
          update: {
            combinationCode: v.combinationCode,
            assignedStudentNumberA: v.studentNumber,
          },
          create: {
            number: v.lockerNumber,
            combinationCode: v.combinationCode,
            assignedStudentNumberA: v.studentNumber,
          },
        }),
      );
    }
    await prisma.$transaction(ops);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        total: rows.length,
        imported: 0,
        errors: [
          `Échec de l'import (transaction annulée). Vérifiez qu'un élève ou un casier n'est pas assigné en double. ${(e as Error).message}`,
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
