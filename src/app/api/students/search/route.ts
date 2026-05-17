import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/students/search?q=texte&excludeId=xxx
// Recherche LIKE (numéro, prénom, nom, groupe). Max 10 résultats.
// Utilisé par l'autocomplete du binôme — accessible à tout utilisateur connecté.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const excludeId = (url.searchParams.get("excludeId") || "").trim();

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  const students = await prisma.student.findMany({
    where: {
      AND: [
        excludeId
          ? { NOT: { OR: [{ id: excludeId }, { studentNumber: excludeId }] } }
          : {},
        {
          OR: [
            { studentNumber: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { group: { contains: q } },
          ],
        },
      ],
    },
    take: 10,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      studentNumber: true,
      firstName: true,
      lastName: true,
      group: true,
      level: true,
    },
  });
  return NextResponse.json(students);
}
