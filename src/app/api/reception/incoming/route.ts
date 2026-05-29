import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET — liste des annonces actives (élèves « en route » vers le poste portable).
// Le poste laptop poll cet endpoint pour mettre à jour son afficheur.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const annonces = await prisma.annonce.findMany({
    where: {
      student: {
        receivesLaptop: true,
        laptopStatus: { not: "DELIVERED" },
      },
    },
    include: {
      student: {
        select: {
          studentNumber: true,
          firstName: true,
          lastName: true,
          group: true,
          level: true,
        },
      },
    },
    orderBy: { announcedAt: "asc" },
  });

  return NextResponse.json(
    annonces.map((a) => ({
      announcedAt: a.announcedAt.toISOString(),
      student: a.student,
    })),
  );
}
