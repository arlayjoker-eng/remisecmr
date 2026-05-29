import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";

// POST — annule une remise de portable (livraison LAPTOP) en cas d'erreur.
// L'élève redevient PENDING et peut être re-scanné pour redo la remise.
// Le PDF est effacé du disque (best-effort).
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ folio: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { folio } = await ctx.params;
  const delivery = await prisma.delivery.findUnique({
    where: { folio },
    include: { student: true },
  });
  if (!delivery) {
    return NextResponse.json({ error: "Livraison introuvable." }, { status: 404 });
  }
  if (delivery.type !== "LAPTOP") {
    return NextResponse.json(
      { error: "Cet endpoint annule uniquement les livraisons de portables." },
      { status: 400 },
    );
  }

  const studentNumber = delivery.student.studentNumber;
  const pdfPath = delivery.pdfPath;

  try {
    await prisma.$transaction([
      prisma.delivery.delete({ where: { id: delivery.id } }),
      prisma.student.update({
        where: { id: delivery.studentId },
        data: { laptopStatus: "PENDING" },
      }),
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur lors de l'annulation. " + (e as Error).message },
      { status: 500 },
    );
  }

  // Effacer le PDF (best-effort : on n'échoue pas si le fichier est déjà parti)
  if (pdfPath) {
    try {
      await fs.unlink(pdfPath);
    } catch {
      /* fichier introuvable ou autre — pas grave */
    }
  }

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "laptop.cancel",
    target: `élève ${studentNumber}`,
    details: `livraison ${folio} annulée`,
  });

  return NextResponse.json({ ok: true });
}
