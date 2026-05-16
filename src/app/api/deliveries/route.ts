import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateReceiptPdf } from "@/lib/pdf";
import { folioFor } from "@/lib/util";
import { NextResponse } from "next/server";

// POST — record a laptop delivery: generate the signed PDF, hash it, and
// flip the student's laptopStatus to "delivered".
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "laptop") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { studentId, tutorName, tutorIdLast4, signaturePngDataUrl } = body as {
    studentId?: string;
    tutorName?: string;
    tutorIdLast4?: string;
    signaturePngDataUrl?: string;
  };
  if (!studentId || !tutorName) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await prisma.delivery.findUnique({ where: { studentId } });
  if (existing) {
    return NextResponse.json({ folio: existing.folio, already: true });
  }

  // resolve operator id (fallback to email lookup)
  let operatorId = session.user.operatorId;
  if (!operatorId && session.user.email) {
    const op = await prisma.operator.findUnique({
      where: { email: session.user.email },
    });
    operatorId = op?.id;
  }
  if (!operatorId) {
    return NextResponse.json({ error: "no_operator" }, { status: 400 });
  }

  const folio = folioFor(studentId);
  const dataUrl = String(signaturePngDataUrl || "");
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const signaturePng = Buffer.from(base64, "base64");

  let accessories: string[] = [];
  try {
    accessories = JSON.parse(student.accessories || "[]");
  } catch {
    accessories = [];
  }

  const deliveredAt = new Date();
  const { sha256, pdfPath } = await generateReceiptPdf({
    folio,
    student: {
      first: student.firstName,
      last: student.lastName,
      id: student.id,
      group: student.groupName,
      box: student.box,
      device: student.device,
      serial: student.serial,
      accessories,
    },
    tutorName,
    tutorIdLast4: tutorIdLast4 || "",
    operatorName: session.user.name || "Opérateur",
    signaturePng,
    deliveredAt,
  });

  const delivery = await prisma.delivery.create({
    data: {
      folio,
      studentId,
      operatorId,
      tutorNameTyped: tutorName,
      tutorIdLast4: tutorIdLast4 || "",
      signaturePng,
      pdfPath,
      pdfSha256: sha256,
      deliveredAt,
    },
  });
  await prisma.student.update({
    where: { id: studentId },
    data: { laptopStatus: "delivered" },
  });

  return NextResponse.json({ folio: delivery.folio, sha256 });
}
