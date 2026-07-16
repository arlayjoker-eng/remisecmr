import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isValidFolio } from "@/lib/util";
import { NextResponse } from "next/server";

// POST — annule une remise de portable en cas d'erreur.
// Sécurité (intégrité légale) :
//  - réservé à un STAFF_MANAGER ou SUPER_ADMIN (plus « n'importe quel opérateur ») ;
//  - PLUS de suppression sèche : la remise est recopiée dans DeliveryArchive
//    (signature + PDF conservés) avant de retirer la ligne active, ce qui permet
//    une nouvelle remise tout en gardant une preuve inaltérable ;
//  - le fichier PDF n'est PAS effacé du disque.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ folio: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "STAFF_MANAGER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { folio } = await ctx.params;
  if (!isValidFolio(folio)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const reason = await req
    .json()
    .then((b) => String(b?.reason ?? "").slice(0, 500))
    .catch(() => "");

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

  try {
    await prisma.$transaction([
      // 1) Preuve archivée (append-only) — signature/tutorIdLast4 restent
      //    chiffrés tels qu'ils étaient stockés.
      prisma.deliveryArchive.create({
        data: {
          originalDeliveryId: delivery.id,
          type: delivery.type,
          studentId: delivery.studentId,
          studentNumber,
          operatorId: delivery.operatorId,
          folio: delivery.folio,
          tutorNameTyped: delivery.tutorNameTyped,
          tutorIdLast4: delivery.tutorIdLast4,
          signaturePng: delivery.signaturePng,
          pdfPath: delivery.pdfPath,
          pdfSha256: delivery.pdfSha256,
          deliveredAt: delivery.deliveredAt,
          canceledBy: String(session.user.id ?? ""),
          canceledByName: session.user.name || "?",
          reason: reason || null,
        },
      }),
      // 2) Retirer la ligne active pour permettre une nouvelle remise.
      prisma.delivery.delete({ where: { id: delivery.id } }),
      // 3) L'élève redevient PENDING.
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

  // Le PDF reste sur le disque (preuve légale). On ne l'efface pas.

  await logAudit({
    userId: String(session.user.id ?? ""),
    userName: session.user.name || "?",
    action: "laptop.cancel",
    target: `élève ${studentNumber}`,
    details: `livraison ${folio} annulée et archivée${reason ? ` · motif: ${reason}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
