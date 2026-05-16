import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { notFound } from "next/navigation";
import Link from "next/link";
import CasierScreen from "@/components/screens/CasierScreen";
import { K } from "@/lib/k";

export const dynamic = "force-dynamic";

export default async function CasierPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId: raw } = await params;
  const studentId = decodeURIComponent(raw);
  const session = await auth();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  if (!student) notFound();

  const locker = await prisma.locker.findFirst({
    where: { OR: [{ ownerId: studentId }, { binomeId: studentId }] },
    include: { owner: true, binome: true },
  });

  if (!locker) {
    return <NoLocker name={`${student.firstName} ${student.lastName}`} />;
  }

  const eligible = await prisma.student.findMany({
    where: {
      ownedLocker: { is: null },
      NOT: { id: studentId },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <CasierScreen
      student={toClientStudent(student)}
      locker={{
        id: locker.id,
        ownerId: locker.ownerId,
        number: locker.number,
        code: locker.code,
        brand: locker.brand,
        aisle: locker.aisle,
        status: locker.status,
        binomeId: locker.binomeId,
      }}
      primaryStudent={toClientStudent(locker.owner)}
      binomeStudent={locker.binome ? toClientStudent(locker.binome) : null}
      operatorName={session?.user?.name || "Opérateur"}
      eligibleBinomes={eligible.map((s) => toClientStudent(s))}
    />
  );
}

function NoLocker({ name }: { name: string }) {
  return (
    <div
      style={{
        height: "100%",
        background: K.bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 60,
        gap: 18,
        textAlign: "center",
        fontFamily: K.body,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: "rgba(255,255,255,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.25" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </div>
      <div style={{ fontFamily: K.display, fontSize: 28, fontWeight: 800 }}>
        Aucun casier attribué
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.7)",
          fontWeight: 600,
          maxWidth: 440,
        }}
      >
        L&apos;élève <strong>{name}</strong> n&apos;a pas de casier dans la base
        et n&apos;est pas binôme d&apos;un autre élève.
      </div>
      <Link
        href="/scan"
        style={{
          background: "#fff",
          color: K.ink,
          borderRadius: 999,
          padding: "14px 26px",
          fontFamily: K.display,
          fontWeight: 800,
          fontSize: 14,
          textDecoration: "none",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          boxShadow: "0 4px 0 rgba(27,15,69,0.20)",
        }}
      >
        Retour au scanner
      </Link>
    </div>
  );
}
