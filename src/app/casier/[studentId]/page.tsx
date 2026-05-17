import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { K } from "@/lib/k";
import CasierScreen from "@/components/screens/CasierScreen";

export const dynamic = "force-dynamic";

export default async function CasierPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const key = decodeURIComponent(studentId);
  const session = await auth();

  const student = await prisma.student.findFirst({
    where: { OR: [{ studentNumber: key }, { id: key }] },
  });
  if (!student) notFound();

  const locker = await prisma.locker.findFirst({
    where: {
      OR: [
        { assignedStudentNumberA: student.studentNumber },
        { assignedStudentNumberB: student.studentNumber },
      ],
    },
    include: { studentA: true, studentB: true },
  });

  if (!locker || !locker.studentA) {
    return <NoLocker name={`${student.firstName} ${student.lastName}`} />;
  }

  const viaBinome = locker.assignedStudentNumberB === student.studentNumber;

  return (
    <CasierScreen
      student={toClientStudent(student)}
      owner={toClientStudent(locker.studentA)}
      binome={locker.studentB ? toClientStudent(locker.studentB) : null}
      viaBinome={viaBinome}
      locker={{
        number: locker.number,
        combinationCode: locker.combinationCode,
        status: locker.status,
      }}
      operatorName={session?.user?.name || "Opérateur"}
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
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.25"
          strokeLinecap="round"
        >
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
        href="/scan?mode=casier"
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
