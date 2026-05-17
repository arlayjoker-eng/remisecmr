import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import Papa from "papaparse";

// POST — import students.csv (PORTABLE list). SUPER_ADMIN only.
// Columns: student_number,first_name,last_name,email,group,level,box_number,laptop_serial,laptop_model
// Atomic: si una sola línea tiene error, no se importa nada.
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
    email: string;
    group: string;
    level: string;
    boxNumber: string | null;
    laptopSerial: string | null;
    laptopModel: string | null;
  }[] = [];

  rows.forEach((row, i) => {
    const line = i + 2; // ligne 1 = en-têtes
    const studentNumber = (row.student_number || "").trim();
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    const email = (row.email || "").trim();
    const group = (row.group || "").trim();
    const level = (row.level || "").trim();

    if (!studentNumber) {
      errors.push(`Ligne ${line}: numéro d'élève manquant`);
      return;
    }
    if (!firstName || !lastName) {
      errors.push(`Ligne ${line}: nom ou prénom manquant (${studentNumber})`);
      return;
    }
    if (!email) {
      errors.push(`Ligne ${line}: courriel manquant (${studentNumber})`);
      return;
    }
    if (!group || !level) {
      errors.push(`Ligne ${line}: groupe ou niveau manquant (${studentNumber})`);
      return;
    }
    valid.push({
      studentNumber,
      firstName,
      lastName,
      email,
      group,
      level,
      boxNumber: (row.box_number || "").trim() || null,
      laptopSerial: (row.laptop_serial || "").trim() || null,
      laptopModel: (row.laptop_model || "").trim() || null,
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
      valid.map((v) =>
        prisma.student.upsert({
          where: { studentNumber: v.studentNumber },
          // re-import: on ne touche PAS laptopStatus (préserve une remise déjà faite)
          update: {
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            group: v.group,
            level: v.level,
            boxNumber: v.boxNumber,
            laptopSerial: v.laptopSerial,
            laptopModel: v.laptopModel,
            receivesLaptop: true,
          },
          create: {
            studentNumber: v.studentNumber,
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            group: v.group,
            level: v.level,
            boxNumber: v.boxNumber,
            laptopSerial: v.laptopSerial,
            laptopModel: v.laptopModel,
            receivesLaptop: true,
            laptopStatus: "PENDING",
          },
        }),
      ),
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        total: rows.length,
        imported: 0,
        errors: [`Échec de l'import (transaction annulée): ${(e as Error).message}`],
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
