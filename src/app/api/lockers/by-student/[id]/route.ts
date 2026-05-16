import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientLocker, toClientStudent } from "@/lib/mappers";
import { NextResponse } from "next/server";

// Finds the locker where the student is the owner OR the binôme.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const sid = decodeURIComponent(id).trim();

  const locker = await prisma.locker.findFirst({
    where: { OR: [{ ownerId: sid }, { binomeId: sid }] },
    include: { owner: true, binome: true },
  });
  if (!locker) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    id: locker.id,
    ownerId: locker.ownerId,
    viaBinome: locker.binomeId === sid,
    ...toClientLocker(locker),
    owner: toClientStudent(locker.owner),
    binomeStudent: locker.binome ? toClientStudent(locker.binome) : null,
  });
}
