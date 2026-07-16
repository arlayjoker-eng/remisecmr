import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { canLaptop, canCasier } from "@/lib/access";
import { K } from "@/lib/k";
import ScannerScreen from "@/components/screens/ScannerScreen";
import RoleNav from "@/components/RoleNav";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const operatorName = session.user.name || "Opérateur";
  const role = session.user.role || "OPERATOR";

  const allowLaptop = canLaptop(session.user);
  const allowCasier = canCasier(session.user);

  const { mode: modeParam } = await searchParams;
  const mode =
    modeParam === "laptop" || modeParam === "casier" ? modeParam : null;

  if (!mode)
    return (
      <ModeSelect role={role} allowLaptop={allowLaptop} allowCasier={allowCasier} />
    );

  // Isolation par mode (CN-002) : l'accès direct par URL est refusé si le poste
  // n'est pas accordé à cet opérateur.
  if (mode === "laptop" && !allowLaptop) redirect("/scan");
  if (mode === "casier" && !allowCasier) redirect("/scan");

  if (mode === "laptop") {
    // Chargement par scan (CN-001) : le poste ne reçoit que des compteurs,
    // jamais la liste des élèves.
    const [pendingCount, deliveredCount] = await Promise.all([
      prisma.student.count({
        where: { receivesLaptop: true, laptopStatus: { not: "DELIVERED" } },
      }),
      prisma.student.count({
        where: { receivesLaptop: true, laptopStatus: "DELIVERED" },
      }),
    ]);
    return (
      <ScannerScreen
        mode="laptop"
        role={role}
        operatorName={operatorName}
        pendingCount={pendingCount}
        deliveredCount={deliveredCount}
      />
    );
  }

  const [pendingCount, deliveredCount] = await Promise.all([
    prisma.student.count({
      where: { receivesLocker: true, lockerDeliveredAt: null },
    }),
    prisma.student.count({
      where: { receivesLocker: true, NOT: { lockerDeliveredAt: null } },
    }),
  ]);
  return (
    <ScannerScreen
      mode="casier"
      role={role}
      operatorName={operatorName}
      pendingCount={pendingCount}
      deliveredCount={deliveredCount}
    />
  );
}

function ModeSelect({
  role,
  allowLaptop,
  allowCasier,
}: {
  role: string;
  allowLaptop: boolean;
  allowCasier: boolean;
}) {
  const cards = [
    allowLaptop && {
      href: "/scan?mode=laptop",
      emoji: "💻",
      title: "Mode Portable",
      sub: "Remise des portables avec signature du parent.",
      grad: "linear-gradient(160deg, #B589F0 0%, #5B2BC9 100%)",
    },
    allowCasier && {
      href: "/scan?mode=casier",
      emoji: "🔒",
      title: "Mode Casier",
      sub: "Attribution des casiers et cadenas (sans signature).",
      grad: "linear-gradient(160deg, #6AE3A8 0%, #2BB070 100%)",
    },
  ].filter(Boolean) as {
    href: string;
    emoji: string;
    title: string;
    sub: string;
    grad: string;
  }[];
  return (
    <div
      style={{
        height: "100%",
        background: K.bgApp,
        color: K.ink,
        animation: "screenIn 0.35s ease both",
        fontFamily: K.body,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Cabecera avec navigation par rôle */}
      <div
        style={{
          padding: "22px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.violet,
              letterSpacing: 1.6,
              textTransform: "uppercase",
            }}
          >
            ● RemiseCMR
          </div>
          <div
            style={{
              fontSize: 12,
              color: K.ink3,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            Collège Mont-Royal · Campus principal
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RoleNav role={role} />
          <LogoutButton />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 11,
            fontWeight: 800,
            color: K.violet,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          ● RemiseCMR
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: -1,
            marginTop: 6,
          }}
        >
          Choisissez le mode
        </div>
      </div>
      <div style={{ display: "flex", gap: 22 }}>
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            style={{
              textDecoration: "none",
              color: "#fff",
              width: 320,
              borderRadius: 28,
              padding: 32,
              background: c.grad,
              boxShadow: "0 14px 40px rgba(15,0,60,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 56 }}>{c.emoji}</div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: -0.6,
              }}
            >
              {c.title}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.9 }}>
              {c.sub}
            </div>
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}
