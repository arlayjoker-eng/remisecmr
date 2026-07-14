import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isValidFolio } from "@/lib/util";
import { sha256Of } from "@/lib/pdf";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";

// GET — stream the signed receipt PDF.
// Sécurité :
//  - session obligatoire ;
//  - folio validé (anti path-traversal) ;
//  - lecture UNIQUEMENT via une ligne Delivery existante (pas de fallback disque
//    sur un chemin dérivé du folio → supprime la lecture de fichier arbitraire) ;
//  - autorisation par ressource : seul l'opérateur qui a fait la remise, un
//    STAFF_MANAGER ou un SUPER_ADMIN peut ouvrir le récépissé (anti-énumération
//    IDOR sur des folios devinables) ;
//  - chaque accès est journalisé.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ folio: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { folio } = await ctx.params;
  if (!isValidFolio(folio)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const role = session.user.role;
  const userId = session.user.id ?? "";
  const download = new URL(req.url).searchParams.get("download") === "1";

  const delivery = await prisma.delivery.findUnique({ where: { folio } });
  if (!delivery || !delivery.pdfPath) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isManager = role === "SUPER_ADMIN" || role === "STAFF_MANAGER";
  const isOwner = delivery.operatorId === userId;
  if (!isManager && !isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let bytes: Buffer | null = null;
  try {
    bytes = await fs.readFile(delivery.pdfPath);
  } catch {
    bytes = null;
  }
  if (!bytes) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Vérification d'intégrité (CN-006) : le fichier servi doit correspondre au
  // hash enregistré à la création. En cas d'écart → altération suspectée.
  if (delivery.pdfSha256 && sha256Of(bytes) !== delivery.pdfSha256) {
    await logAudit({
      userId,
      userName: session.user.name || "Opérateur",
      action: "delivery.pdf.integrity_fail",
      target: folio,
      details: "le hash du PDF sur disque ne correspond pas au hash enregistré",
    });
    return NextResponse.json({ error: "integrity_failed" }, { status: 409 });
  }

  await logAudit({
    userId,
    userName: session.user.name || "Opérateur",
    action: "delivery.pdf.view",
    target: folio,
    details: download ? "téléchargement du récépissé" : "aperçu du récépissé",
  });

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="recepisse_${folio}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
