import { auth } from "@/auth";
import { getReportData, fmtDeliveryDate } from "@/lib/reports";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "STAFF_MANAGER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const { rows } = await getReportData({
    type: sp.get("type") || "",
    level: sp.get("level") || "",
    group: sp.get("group") || "",
    state: sp.get("state") || "",
    from: sp.get("from") || "",
    to: sp.get("to") || "",
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "RemiseCMR";
  wb.created = new Date();

  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FF003C71" },
    },
  };

  // ─── Feuille Portables ──────────────────────────────────────
  const wsP = wb.addWorksheet("Portables");
  wsP.columns = [
    { header: "N° élève", key: "n", width: 14 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Courriel", key: "email", width: 32 },
    { header: "Groupe", key: "groupe", width: 12 },
    { header: "Niveau", key: "niveau", width: 10 },
    { header: "Modèle", key: "modele", width: 32 },
    { header: "Série", key: "serie", width: 18 },
    { header: "Boîte", key: "boite", width: 12 },
    { header: "État", key: "etat", width: 14 },
    { header: "Date livraison", key: "date", width: 20 },
    { header: "Opérateur", key: "operateur", width: 22 },
  ];
  rows
    .filter((r) => r.typeKey === "LAPTOP")
    .forEach((r) =>
      wsP.addRow({
        n: r.studentNumber,
        nom: r.lastName,
        prenom: r.firstName,
        email: r.email,
        groupe: r.group,
        niveau: `Sec ${r.level}`,
        modele: r.laptopModel,
        serie: r.laptopSerial,
        boite: r.boxNumber,
        etat: r.state,
        date: fmtDeliveryDate(r.deliveryDate),
        operateur: r.operator,
      }),
    );

  // ─── Feuille Casiers ────────────────────────────────────────
  const wsC = wb.addWorksheet("Casiers");
  wsC.columns = [
    { header: "N° élève", key: "n", width: 14 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Groupe", key: "groupe", width: 12 },
    { header: "Niveau", key: "niveau", width: 10 },
    { header: "Casier", key: "casier", width: 14 },
    { header: "Code", key: "code", width: 14 },
    { header: "Binôme N°", key: "binomeN", width: 14 },
    { header: "Binôme Nom", key: "binomeNom", width: 24 },
    { header: "État", key: "etat", width: 14 },
    { header: "Date livraison", key: "date", width: 20 },
    { header: "Opérateur", key: "operateur", width: 22 },
  ];
  rows
    .filter((r) => r.typeKey === "CASIER")
    .forEach((r) =>
      wsC.addRow({
        n: r.studentNumber,
        nom: r.lastName,
        prenom: r.firstName,
        groupe: r.group,
        niveau: `Sec ${r.level}`,
        casier: r.lockerNumber,
        code: r.combinationCode,
        binomeN: r.binomeNumber,
        binomeNom: r.binomeName,
        etat: r.state,
        date: fmtDeliveryDate(r.deliveryDate),
        operateur: r.operator,
      }),
    );

  for (const ws of [wsP, wsC]) {
    const header = ws.getRow(1);
    header.eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
    });
    header.height = 20;
  }

  const buf = await wb.xlsx.writeBuffer();
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="remise_cmr_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
