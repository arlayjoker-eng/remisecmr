import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasReceptionAccess, CLAIM_TTL_MS } from "@/lib/access";
import { NextResponse } from "next/server";

// GET — liste complète des élèves recevant un portable, avec statut.
// Statut : PENDING | EN_ROUTE (annoncé) | DELIVERED (remis).
// Utilisé par le tableau de bord du poste réception (accès réservé).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await hasReceptionAccess(session.user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
      appointmentTime: true,
      annonce: {
        select: {
          announcedAt: true,
          announcedByName: true,
          claimedByName: true,
          claimedAt: true,
        },
      },
      // La remise elle-même porte son opérateur. On ne prend que le portable :
      // /api/casier/confirm crée aussi des Delivery, de type CASIER, qui n'ont
      // rien à faire ici. La contrainte @@unique([studentId, type]) garantit
      // qu'il n'y en a qu'une.
      deliveries: {
        where: { type: "LAPTOP" },
        select: {
          deliveredAt: true,
          operator: { select: { fullName: true } },
        },
      },
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
      appointmentTime: s.appointmentTime,
      status:
        s.laptopStatus === "DELIVERED"
          ? "DELIVERED"
          : s.annonce
            ? "EN_ROUTE"
            : "PENDING",
      announcedAt: s.annonce?.announcedAt?.toISOString() ?? null,
      announcedByName: s.annonce?.announcedByName ?? null,
      // Prise en charge encore active seulement : passé le délai, elle est
      // considérée abandonnée et ne doit plus s'afficher comme en cours.
      claimedByName:
        s.annonce?.claimedAt &&
        Date.now() - s.annonce.claimedAt.getTime() < CLAIM_TTL_MS
          ? s.annonce.claimedByName
          : null,
      // Qui a fait la remise. Reste null si laptopStatus vaut DELIVERED sans
      // Delivery correspondante (un import de portables efface les remises en
      // conservant le statut) : on préfère ne rien afficher qu'inventer un nom.
      deliveredByName: s.deliveries[0]?.operator?.fullName ?? null,
      deliveredAt: s.deliveries[0]?.deliveredAt?.toISOString() ?? null,
    })),
  );
}
