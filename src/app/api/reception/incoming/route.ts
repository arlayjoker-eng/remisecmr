import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canLaptop, hasReceptionAccess } from "@/lib/access";
import { NextResponse } from "next/server";

// Une prise en charge expire après ce délai (auto-libération).
const CLAIM_TTL_MS = 5 * 60 * 1000; // 5 minutes

// GET — liste des annonces actives (élèves « en route » vers le poste portable).
// Vue par le poste laptop (qui prend en charge) ET par la réception.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canLaptop(session.user) && !(await hasReceptionAccess(session.user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
          boxNumber: true,
        },
      },
    },
    orderBy: { announcedAt: "asc" },
  });

  const now = Date.now();
  return NextResponse.json(
    annonces.map((a) => {
      const claimActive =
        !!a.claimedAt && now - a.claimedAt.getTime() < CLAIM_TTL_MS;
      return {
        announcedAt: a.announcedAt.toISOString(),
        student: a.student,
        claimedBy: claimActive ? a.claimedBy : null,
        claimedByName: claimActive ? a.claimedByName : null,
      };
    }),
  );
}
