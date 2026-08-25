import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { CLAIM_TTL_MS } from "@/lib/access";
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

// DELETE — annule une annonce : l'élève repasse « à remettre ».
// body: { studentNumber }
//
// Refusé (409) si un poste portable a déjà pris l'élève en charge et que la
// prise en charge est encore active : à ce moment-là l'élève est devant
// l'opérateur, et le lui retirer de l'écran en pleine remise ferait plus de
// dégâts que l'annulation n'en répare.
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
    select: { id: true, firstName: true, lastName: true },
  });
  if (!student) {
    return NextResponse.json(
      { error: `Élève « ${studentNumber} » introuvable.` },
      { status: 404 },
    );
  }

  const annonce = await prisma.annonce.findUnique({
    where: { studentId: student.id },
  });
  if (!annonce) {
    // Déjà annulée ailleurs (l'écran se rafraîchit toutes les 5 s) : le
    // résultat voulu est atteint, ce n'est pas une erreur.
    return NextResponse.json({ ok: true, alreadyGone: true });
  }

  const claimActive =
    !!annonce.claimedAt &&
    Date.now() - annonce.claimedAt.getTime() < CLAIM_TTL_MS;
  if (claimActive) {
    return NextResponse.json(
      {
        error: `Impossible d'annuler : ${student.firstName} ${student.lastName} est déjà pris en charge par ${annonce.claimedByName || "un poste portable"}.`,
      },
      { status: 409 },
    );
  }

  await prisma.annonce.delete({ where: { id: annonce.id } });

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "reception.announce.cancel",
    target: `élève ${studentNumber}`,
    details: `${student.firstName} ${student.lastName} — annonce annulée`,
  });

  return NextResponse.json({ ok: true });
}
