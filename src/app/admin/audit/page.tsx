import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { K } from "@/lib/k";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "casier.edit": "Modification casier",
  "casier.remise": "Remise casier",
};

export default async function AuditPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/");

  const logs = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: 200,
  });

  const th: CSSProperties = {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 10.5,
    fontWeight: 800,
    color: K.ink3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottom: `2px solid ${K.line}`,
    whiteSpace: "nowrap",
  };
  const td: CSSProperties = {
    padding: "12px 14px",
    borderBottom: `1px solid ${K.line}`,
    fontSize: 13.5,
    color: K.ink,
    verticalAlign: "top",
  };

  return (
    <div
      style={{
        height: "100%",
        background: K.bgApp,
        color: K.ink,
        animation: "screenIn 0.35s ease both",
        fontFamily: K.body,
        padding: 40,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
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
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              Journal d&apos;audit
            </div>
          </div>
          <Link
            href="/admin"
            style={{
              background: "#1E3A5F",
              color: "#fff",
              boxShadow: "0 4px 0 #0F2540, 0 10px 22px rgba(30,58,95,0.25)",
              borderRadius: 999,
              padding: "12px 22px",
              fontFamily: K.display,
              fontWeight: 800,
              fontSize: 13,
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            ← Retour
          </Link>
        </div>

        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 8,
            boxShadow: K.shadowCard,
            overflow: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: K.display,
            }}
          >
            <thead>
              <tr>
                <th style={th}>Date / heure</th>
                <th style={th}>Utilisateur</th>
                <th style={th}>Action</th>
                <th style={th}>Cible</th>
                <th style={th}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ ...td, fontSize: 12, color: K.ink3, whiteSpace: "nowrap" }}>
                    {new Date(l.at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{l.userName}</td>
                  <td style={td}>{ACTION_LABELS[l.action] || l.action}</td>
                  <td style={{ ...td, fontFamily: K.mono, fontSize: 12.5 }}>
                    {l.target}
                  </td>
                  <td style={{ ...td, fontSize: 12.5, color: K.ink2 }}>
                    {l.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      ...td,
                      textAlign: "center",
                      color: K.ink3,
                      padding: 32,
                    }}
                  >
                    Aucune action enregistrée pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
