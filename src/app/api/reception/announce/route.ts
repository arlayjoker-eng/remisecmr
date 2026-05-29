import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// POST — la réception annonce qu'un élève arrive pour récupérer son portable.
// body: { studentNumber }
// Accessible aux usagers avec accessReception=true (ou SUPER_ADMIN).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Vérifier l'accès réception
  const me = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { accessReception: true, role: true },
  });
  if (!me || (me.role !== "SUPER_ADMIN" && !me.accessReception)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  if (!studentNumber) {
    return NextResponse.json(
      { error: "Numéro d'élève manquant." },
      { status: 400 },
    );
  }

  const student = await prisma.student.findUnique({
    where: { studentNumber },
    select: {
      id: true,
      studentNumber: true,
      firstName: true,
      lastName: true,
      group: true,
      level: true,
      receivesLaptop: true,
      laptopStatus: true,
    },
  });
  if (!student) {
    return NextResponse.json(
      { error: `Élève « ${studentNumber} » introuvable.` },
      { status: 404 },
    );
  }
  if (!student.receivesLaptop) {
    return NextResponse.json(
      { error: "Cet élève n'est pas sur la liste des portables." },
      { status: 400 },
    );
  }
  if (student.laptopStatus === "DELIVERED") {
    return NextResponse.json(
      { error: "Cet élève a déjà reçu son portable." },
      { status: 400 },
    );
  }

  // Upsert l'annonce — si l'élève est déjà annoncé on rafraîchit l'heure
  await prisma.annonce.upsert({
    where: { studentId: student.id },
    update: {
      announcedAt: new Date(),
      announcedBy: String(session.user.id ?? ""),
    },
    create: {
      studentId: student.id,
      announcedBy: String(session.user.id ?? ""),
    },
  });

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "reception.announce",
    target: `élève ${studentNumber}`,
    details: `${student.firstName} ${student.lastName} annoncé au poste portable`,
  });

  return NextResponse.json({
    ok: true,
    student: {
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      group: student.group,
      level: student.level,
    },
  });
}
