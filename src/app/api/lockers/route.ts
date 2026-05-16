import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientLocker, toClientStudent } from "@/lib/mappers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const status = new URL(req.url).searchParams.get("status");
  const where =
    status === "pending" || status === "delivered" ? { status } : {};
  const lockers = await prisma.locker.findMany({
    where,
    include: { owner: true, binome: true },
    orderBy: { number: "asc" },
  });
  return NextResponse.json(
    lockers.map((l) => ({
      id: l.id,
      ownerId: l.ownerId,
      ...toClientLocker(l),
      owner: toClientStudent(l.owner),
      binomeStudent: l.binome ? toClientStudent(l.binome) : null,
    })),
  );
}
