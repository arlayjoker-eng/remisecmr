import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET — liste complète des élèves recevant un portable, avec statut.
// Statut : PENDING | EN_ROUTE (annoncé) | DELIVERED (remis).
// Utilisé par le tableau de bord du poste réception.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    where: { receivesLaptop: true },
    select: {
      studentNumber: true,
      firstName: true,
      lastName: true,
      group: true,
      level: true,
      laptopStatus: true,
      annonce: { select: { announcedAt: true } },
    },
    orderBy: [{ group: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(
    students.map((s) => ({
      studentNumber: s.studentNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      group: s.group,
      level: s.level,
      status:
        s.laptopStatus === "DELIVERED"
          ? "DELIVERED"
          : s.annonce
            ? "EN_ROUTE"
            : "PENDING",
      announcedAt: s.annonce?.announcedAt?.toISOString() ?? null,
    })),
  );
}
