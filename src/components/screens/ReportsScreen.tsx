"use client";
// Rapports — filtres, statistiques, tableau, export Excel.
import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { K, Btn, Pill, Icons } from "@/components/ui";
import RoleNav from "@/components/RoleNav";

type Row = {
  typeKey: string;
  type: string;
  studentNumber: string;
  name: string;
  group: string;
  level: string;
  details: string;
  state: string;
  stateKey: string;
  deliveryDate: string;
  operator: string;
  binomeName: string;
};

type Filters = {
  type: string;
  level: string;
  group: string;
  state: string;
  from: string;
  to: string;
};

export default function ReportsScreen({
  rows,
  stats,
  groups,
  filters,
  role,
}: {
  rows: Row[];
  stats: { total: number; delivered: number; pending: number };
  groups: string[];
  filters: Filters;
  role: string;
}) {
  const router = useRouter();
  const [f, setF] = React.useState<Filters>(filters);

  const apply = (next: Filters) => {
    const qs = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    router.push(`/reports${qs.toString() ? `?${qs}` : ""}`);
  };

  const reset = () => {
    const empty = { type: "", level: "", group: "", state: "", from: "", to: "" };
    setF(empty);
    router.push("/reports");
  };

  const exportXlsx = () => {
    const qs = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    window.open(`/api/reports/export?${qs}`, "_blank");
  };

  const pct = (n: number) =>
    stats.total ? Math.round((n / stats.total) * 100) : 0;

  return (
    <div
      style={{
        height: "100%",
        background: K.bg,
        color: "#fff",
        fontFamily: K.body,
        padding: 32,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: "#B589F0",
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              ● RemiseCMR · Rapports
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
              Suivi des remises
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn
              kind="ghostDark"
              size="md"
              icon={Icons.back({ size: 18, stroke: "#fff" })}
              onClick={() =>
                router.push(role === "SUPER_ADMIN" ? "/admin" : "/scan")
              }
            >
              Retour
            </Btn>
            <RoleNav role={role} current="reports" />
            <Btn
              kind="ghostDark"
              size="md"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Déconnexion
            </Btn>
          </div>
        </div>

        {/* Filtres */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 18,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
            marginBottom: 16,
          }}
        >
          <FilterSelect
            label="Type"
            value={f.type}
            onChange={(v) => setF({ ...f, type: v })}
            options={[
              ["", "Tous"],
              ["LAPTOP", "Portable"],
              ["CASIER", "Casier"],
            ]}
          />
          <FilterSelect
            label="Niveau"
            value={f.level}
            onChange={(v) => setF({ ...f, level: v })}
            options={[
              ["", "Tous"],
              ["1", "Sec 1"],
              ["2", "Sec 2"],
              ["3", "Sec 3"],
              ["4", "Sec 4"],
              ["5", "Sec 5"],
            ]}
          />
          <FilterSelect
            label="Groupe"
            value={f.group}
            onChange={(v) => setF({ ...f, group: v })}
            options={[["", "Tous"], ...groups.map((g) => [g, g] as [string, string])]}
          />
          <FilterSelect
            label="État"
            value={f.state}
            onChange={(v) => setF({ ...f, state: v })}
            options={[
              ["", "Tous"],
              ["DELIVERED", "Livré"],
              ["PENDING", "En attente"],
            ]}
          />
          <FilterDate
            label="Date début"
            value={f.from}
            onChange={(v) => setF({ ...f, from: v })}
          />
          <FilterDate
            label="Date fin"
            value={f.to}
            onChange={(v) => setF({ ...f, to: v })}
          />
          <Btn kind="primary" size="md" onClick={() => apply(f)}>
            Appliquer
          </Btn>
          <Btn kind="ghost" size="md" onClick={reset}>
            Réinitialiser
          </Btn>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <StatCard label="Total" value={stats.total} tone="#5B2BC9" />
          <StatCard
            label="Livrés"
            value={stats.delivered}
            extra={`${pct(stats.delivered)} %`}
            tone="#36C26B"
          />
          <StatCard
            label="En attente"
            value={stats.pending}
            extra={`${pct(stats.pending)} %`}
            tone="#FF8C42"
          />
        </div>

        {/* Export */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <Btn
            kind="success"
            size="md"
            icon={Icons.download({ size: 18, stroke: "#fff" })}
            onClick={exportXlsx}
          >
            Télécharger Excel
          </Btn>
        </div>

        {/* Tableau */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 8,
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
                {[
                  "N° élève",
                  "Nom complet",
                  "Groupe",
                  "Niveau",
                  "Type",
                  "Détails",
                  "État",
                  "Date livraison",
                  "Opérateur",
                  "Binôme",
                  "Reçu PDF",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: K.ink3,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      borderBottom: `2px solid ${K.line}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>
                    <span style={{ fontFamily: K.mono, fontSize: 12.5 }}>
                      {r.studentNumber}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.name}</td>
                  <td style={td}>{r.group}</td>
                  <td style={td}>Sec {r.level}</td>
                  <td style={td}>
                    <Pill tone={r.typeKey === "LAPTOP" ? "primary" : "success"}>
                      {r.type}
                    </Pill>
                  </td>
                  <td style={{ ...td, fontSize: 12.5, color: K.ink2 }}>
                    {r.details}
                  </td>
                  <td style={td}>
                    <Pill tone={r.stateKey === "DELIVERED" ? "success" : "warn"}>
                      {r.state}
                    </Pill>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: K.ink3 }}>
                    {r.deliveryDate || "—"}
                  </td>
                  <td style={{ ...td, fontSize: 12.5 }}>
                    {r.operator || "—"}
                  </td>
                  <td style={{ ...td, fontSize: 12.5 }}>
                    {r.binomeName || "—"}
                  </td>
                  <td style={td}>
                    {r.typeKey === "LAPTOP" && r.stateKey === "DELIVERED" ? (
                      <PdfCell folio={`AE-26-${r.studentNumber}`} />
                    ) : (
                      <span style={{ color: K.ink4 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      ...td,
                      textAlign: "center",
                      color: K.ink3,
                      padding: 32,
                    }}
                  >
                    Aucun résultat pour ces filtres.
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

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: `1px solid ${K.line}`,
  fontSize: 13.5,
  color: K.ink,
};

function StatCard({
  label,
  value,
  extra,
  tone,
}: {
  label: string;
  value: number;
  extra?: string;
  tone: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        color: K.ink,
        borderRadius: 20,
        padding: "18px 22px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 10,
          height: 48,
          borderRadius: 6,
          background: tone,
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: K.ink3,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 34,
            fontWeight: 800,
            color: K.ink,
            letterSpacing: -1,
          }}
        >
          {value}
          {extra && (
            <span
              style={{
                fontSize: 15,
                color: K.ink3,
                marginLeft: 8,
                fontWeight: 700,
              }}
            >
              {extra}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const ctrlLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: K.ink3,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 5,
};

const ctrlStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: `2px solid ${K.lineStrong}`,
  padding: "0 12px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: K.display,
  color: K.ink,
  outline: "none",
  background: K.surfaceCool,
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={ctrlLabel}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...ctrlStyle, minWidth: 130 }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={ctrlLabel}>{label}</div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={ctrlStyle}
      />
    </div>
  );
}

const pdfBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  background: K.violetSoft,
  color: K.violetDeep,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1,
};

function PdfCell({ folio }: { folio: string }) {
  const url = `/api/deliveries/${folio}/pdf`;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        title="Voir le PDF"
        style={pdfBtn}
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        👁 Voir
      </button>
      <button
        title="Télécharger le PDF"
        style={pdfBtn}
        onClick={() => window.open(`${url}?download=1`, "_blank", "noopener")}
      >
        ⬇
      </button>
    </div>
  );
}
