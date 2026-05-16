import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { NextResponse } from "next/server";

// Lookup by barcode value (`code`) or matricule (`id`).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { code } = await ctx.params;
  const q = decodeURIComponent(code).trim();
  if (!q) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const student = await prisma.student.findFirst({
    where: { OR: [{ code: q }, { id: q }] },
    include: { delivery: true },
  });
  if (!student) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(toClientStudent(student));
}
