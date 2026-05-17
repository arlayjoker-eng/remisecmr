import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { pdfPathFor } from "@/lib/pdf";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";

// GET — stream the signed receipt PDF (session-protected).
export async function GET(
  req: Request,
  ctx: { params: Promise<{ folio: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { folio } = await ctx.params;
  // ?download=1 → téléchargement (attachment) ; sinon aperçu (inline)
  const download = new URL(req.url).searchParams.get("download") === "1";

  const delivery = await prisma.delivery.findUnique({ where: { folio } });
  let bytes: Buffer | null = null;
  if (delivery) {
    try {
      bytes = await fs.readFile(delivery.pdfPath);
    } catch {
      bytes = null;
    }
  }
  if (!bytes) {
    try {
      bytes = await fs.readFile(pdfPathFor(folio));
    } catch {
      bytes = null;
    }
  }
  if (!bytes) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="recepisse_${folio}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
