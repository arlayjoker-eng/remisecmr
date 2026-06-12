import { auth } from "@/auth";
import Link from "next/link";
import { K } from "@/lib/k";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/admin/import",
    emoji: "📥",
    title: "Importer les listes",
    sub: "Charger les CSV des élèves recevant un portable ou un casier.",
    accent: K.violet,
  },
  {
    href: "/admin/users",
    emoji: "👤",
    title: "Gestion des utilisateurs",
    sub: "Créer et gérer les comptes opérateurs, gestionnaires et admins.",
    accent: K.teal,
  },
  {
    href: "/reports",
    emoji: "📊",
    title: "Rapports",
    sub: "Suivi des remises, filtres et export Excel.",
    accent: K.pink,
  },
  {
    href: "/scan",
    emoji: "📷",
    title: "Scanner",
    sub: "Accéder au mode remise (portables / casiers).",
    accent: K.green,
  },
  {
    href: "/cadenas",
    emoji: "🔎",
    title: "Recherche cadenas",
    sub: "Trouver un casier par n° de série ou n° de casier.",
    accent: K.yellow,
  },
  {
    href: "/reception",
    emoji: "🔔",
    title: "Réception",
    sub: "Annoncer un élève au poste de remise des portables.",
    accent: K.pink,
  },
  {
    href: "/admin/audit",
    emoji: "📋",
    title: "Journal d'audit",
    sub: "Historique des modifications et remises de casiers.",
    accent: K.orange,
  },
];

export default async function AdminHome() {
  const session = await auth();
  return (
    <div
      style={{
        height: "100%",
        background: K.bgApp,
        color: K.ink,
        animation: "screenIn 0.35s ease both",
        fontFamily: K.body,
        padding: 48,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
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
              ● RemiseCMR · Administration
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              Bonjour, {session?.user?.name || "Administrateur"}
            </div>
          </div>
          <LogoutButton />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              style={{
                textDecoration: "none",
                background: "#fff",
                color: K.ink,
                borderRadius: 24,
                padding: 26,
                boxShadow: K.shadowCard,
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: c.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  flexShrink: 0,
                }}
              >
                {c.emoji}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: K.display,
                    fontSize: 20,
                    fontWeight: 800,
                    color: K.ink,
                  }}
                >
                  {c.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: K.ink3,
                    fontWeight: 600,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {c.sub}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
