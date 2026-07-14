import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { canCasier } from "@/lib/access";
import { NextResponse } from "next/server";

// GET — recherche d'un cadenas par n° de série OU n° de casier.
// Sécurité (CN-002 / H2) :
//  - réservé aux opérateurs autorisés au mode casier (+ responsables/admins) ;
//  - requête d'au moins 2 caractères et max 20 résultats (anti-énumération en
//    masse des combinaisons) ;
//  - chaque consultation qui révèle des combinaisons est journalisée.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canCasier(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const lockers = await prisma.locker.findMany({
    where: {
      OR: [{ number: { contains: q } }, { serialNumber: { contains: q } }],
    },
    select: {
      id: true,
      number: true,
      serialNumber: true,
      combinationCode: true,
      status: true,
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
    take: 20,
  });

  if (lockers.length > 0) {
    await logAudit({
      userId: String(session.user.id ?? ""),
      userName: session.user.name || "?",
      action: "cadenas.consultation",
      target: `recherche "${q}"`,
      details: `${lockers.length} cadenas consultés (combinaisons révélées)`,
    });
  }

  return NextResponse.json(lockers);
}
