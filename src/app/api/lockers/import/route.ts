import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import Papa from "papaparse";

// POST — upload lockers.csv (raw CSV text in the request body).
// Columns: locker_number,owner_id,brand,code,aisle
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const csv = await req.text();
  if (!csv.trim()) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  let imported = 0;
  const errors: string[] = [];

  for (const row of parsed.data) {
    const number = (row.locker_number || "").trim();
    const ownerId = (row.owner_id || "").trim();
    if (!number || !ownerId) {
      errors.push(`Ligne ignorée (numéro/élève manquant): ${number || "?"}`);
      continue;
    }
    const owner = await prisma.student.findUnique({ where: { id: ownerId } });
    if (!owner) {
      errors.push(`Casier ${number}: élève ${ownerId} introuvable`);
      continue;
    }
    const data = {
      number,
      brand: (row.brand || "Master Lock 1500iD").trim(),
      code: (row.code || "00-00-00").trim(),
      aisle: (row.aisle || "").trim(),
    };
    try {
      await prisma.locker.upsert({
        where: { ownerId },
        update: data,
        create: { ownerId, ...data },
      });
      imported++;
    } catch (e) {
      errors.push(`Échec import ${number}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ imported, total: parsed.data.length, errors });
}
