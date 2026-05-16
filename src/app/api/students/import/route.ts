import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hueFromName } from "@/lib/util";
import { NextResponse } from "next/server";
import Papa from "papaparse";

// POST — upload students.csv (raw CSV text in the request body).
// Columns: id,code,first_name,last_name,group,device,serial,accessories,
//          tutor_name,tutor_phone,paid   (optional: box)
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
    const id = (row.id || "").trim();
    const code = (row.code || "").trim();
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    if (!id || !code || !firstName) {
      errors.push(`Ligne ignorée (id/code/prénom manquant): ${id || "?"}`);
      continue;
    }
    const accessories = (row.accessories || "")
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean);
    const data = {
      code,
      firstName,
      lastName,
      groupName: (row.group || "").trim(),
      box: (row.box || `CS-${id.slice(-3)}`).trim(),
      device: (row.device || "").trim(),
      serial: (row.serial || "").trim(),
      accessories: JSON.stringify(accessories),
      tutorName: (row.tutor_name || "").trim(),
      tutorPhone: (row.tutor_phone || "").trim(),
      paid: String(row.paid || "true").trim().toLowerCase() !== "false",
      avatarHue: hueFromName(firstName, lastName),
    };
    try {
      await prisma.student.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
      imported++;
    } catch (e) {
      errors.push(`Échec import ${id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ imported, total: parsed.data.length, errors });
}
