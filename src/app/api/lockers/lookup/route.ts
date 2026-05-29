import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET — recherche d'un cadenas par n° de série OU n° de casier.
// Retourne le casier + les élèves assignés (s'il y en a).
// Accessible à tout utilisateur connecté (opérateurs inclus).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json([]);

  const lockers = await prisma.locker.findMany({
    where: {
      OR: [
        { number: { contains: q } },
        { serialNumber: { contains: q } },
      ],
    },
    include: {
      studentA: {
        select: {
          studentNumber: true,
          firstName: true,
          lastName: true,
          group: true,
          level: true,
        },
      },
      studentB: {
        select: {
          studentNumber: true,
          firstName: true,
          lastName: true,
          group: true,
          level: true,
        },
      },
    },
    orderBy: { number: "asc" },
    take: 50,
  });
  return NextResponse.json(lockers);
}
