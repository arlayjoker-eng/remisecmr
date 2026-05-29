import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/pdf";
import { folioFor } from "@/lib/util";
import { NextResponse } from "next/server";

// POST — remise d'un portable : génère le PDF signé et passe laptopStatus à DELIVERED.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  const tutorName = String(body?.tutorName ?? "").trim();
  const tutorIdLast4 = String(body?.tutorIdLast4 ?? "").trim();
  const signaturePngDataUrl = String(body?.signaturePngDataUrl ?? "");

  if (!studentNumber || !tutorName) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { OR: [{ studentNumber }, { id: studentNumber }] },
  });
  if (!student) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await prisma.delivery.findUnique({
    where: { studentId_type: { studentId: student.id, type: "LAPTOP" } },
  });
  if (existing) {
    return NextResponse.json({ folio: existing.folio, already: true });
  }

  const operatorId = session.user.id;
  if (!operatorId) {
    return NextResponse.json({ error: "no_operator" }, { status: 400 });
  }

  const folio = folioFor(student.studentNumber);
  const base64 = signaturePngDataUrl.includes(",")
    ? signaturePngDataUrl.split(",")[1]
    : signaturePngDataUrl;
  const signaturePng = Buffer.from(base64, "base64");
  const deliveredAt = new Date();

  const { sha256, pdfPath } = await generateReceiptPdf({
    folio,
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      studentNumber: student.studentNumber,
      group: student.group,
      level: student.level,
      boxNumber: student.boxNumber,
      laptopModel: student.laptopModel,
      laptopSerial: student.laptopSerial,
    },
    tutorName,
    tutorIdLast4,
    operatorName: session.user.name || "Opérateur",
    signaturePng,
    deliveredAt,
  });

  const delivery = await prisma.delivery.create({
    data: {
      type: "LAPTOP",
      studentId: student.id,
      operatorId,
      folio,
      tutorNameTyped: tutorName,
      tutorIdLast4,
      signaturePng,
      pdfPath,
      pdfSha256: sha256,
      deliveredAt,
    },
  });
  await prisma.student.update({
    where: { id: student.id },
    data: { laptopStatus: "DELIVERED" },
  });

  // Si l'élève avait été annoncé par la réception, on retire l'annonce.
  await prisma.annonce.deleteMany({ where: { studentId: student.id } });

  return NextResponse.json({ folio: delivery.folio, sha256 });
}
