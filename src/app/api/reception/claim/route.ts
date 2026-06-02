import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const CLAIM_TTL_MS = 5 * 60 * 1000;

// POST — un opérateur laptop prend en charge un élève annoncé.
// body: { studentNumber }
// Échoue (409) si déjà pris en charge activement par un autre opérateur.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const myId = String(session.user.id ?? "");
  const myName = session.user.name || "Opérateur";

  const body = await req.json().catch(() => null);
  const studentNumber = String(body?.studentNumber ?? "").trim();
  if (!studentNumber) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { studentNumber },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Élève introuvable." }, { status: 404 });
  }

  const annonce = await prisma.annonce.findUnique({
    where: { studentId: student.id },
  });
  if (!annonce) {
    // Pas d'annonce active — rien à verrouiller, on laisse passer.
    return NextResponse.json({ ok: true, noAnnonce: true });
  }

  const now = Date.now();
  const claimActive =
    !!annonce.claimedAt && now - annonce.claimedAt.getTime() < CLAIM_TTL_MS;

  if (claimActive && annonce.claimedBy && annonce.claimedBy !== myId) {
    return NextResponse.json(
      {
        error: `Déjà pris en charge par ${annonce.claimedByName || "un autre poste"}.`,
        claimedByName: annonce.claimedByName,
      },
      { status: 409 },
    );
  }

  await prisma.annonce.update({
    where: { id: annonce.id },
    data: {
      claimedBy: myId,
      claimedByName: myName,
      claimedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — libère sa propre prise en charge (retour sans remise).
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const myId = String(session.user.id ?? "");
  const studentNumber = String(
    new URL(req.url).searchParams.get("studentNumber") ?? "",
  ).trim();
  if (!studentNumber) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  const student = await prisma.student.findUnique({
    where: { studentNumber },
    select: { id: true },
  });
  if (student) {
    await prisma.annonce.updateMany({
      where: { studentId: student.id, claimedBy: myId },
      data: { claimedBy: null, claimedByName: null, claimedAt: null },
    });
  }
  return NextResponse.json({ ok: true });
}
