import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

// GET — liste des absents (élèves portable PAS encore remis) en Excel.
// Pour le suivi après l'événement : qui n'est pas venu chercher son portable.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    where: { receivesLaptop: true, laptopStatus: { not: "DELIVERED" } },
    select: {
      studentNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      group: true,
      level: true,
      boxNumber: true,
      annonce: { select: { announcedAt: true } },
    },
    orderBy: [{ group: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "RemiseCMR";
  wb.created = new Date();
  const ws = wb.addWorksheet("Absents");
  ws.columns = [
    { header: "N° élève", key: "n", width: 14 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Courriel", key: "email", width: 32 },
    { header: "Groupe", key: "groupe", width: 12 },
    { header: "Niveau", key: "niveau", width: 10 },
    { header: "Boîte", key: "boite", width: 12 },
    { header: "Statut", key: "statut", width: 16 },
  ];
  students.forEach((s) =>
    ws.addRow({
      n: s.studentNumber,
      nom: s.lastName,
      prenom: s.firstName,
      email: s.email || "",
      groupe: s.group,
      niveau: `Sec ${s.level}`,
      boite: s.boxNumber || "",
      statut: s.annonce ? "En route" : "Pas venu",
    }),
  );
  const header = ws.getRow(1);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF003C71" },
    };
  });
  header.height = 20;

  const buf = await wb.xlsx.writeBuffer();
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;

  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="absents_portables_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
