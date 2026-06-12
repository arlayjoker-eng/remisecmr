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
  binomeNumber: string;
  lockerNumber: string;
  combinationCode: string;
  petitCasier: string;
};

type EditTarget = {
  studentNumber: string;
  name: string;
  lockerNumber: string;
  combinationCode: string;
  binomeNumber: string;
  binomeName: string;
  petitCasier: string;
};

const canEdit = (role: string) =>
  role === "SUPER_ADMIN" || role === "STAFF_MANAGER";

type LevelRow = {
  level: string;
  laptopTotal: number;
  laptopDone: number;
  casierTotal: number;
  casierDone: number;
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
  access,
  byLevel,
}: {
  rows: Row[];
  stats: { total: number; delivered: number; pending: number };
  groups: string[];
  filters: Filters;
  role: string;
  access: { laptop: boolean; casier: boolean };
  byLevel: LevelRow[];
}) {
  const router = useRouter();
  const [f, setF] = React.useState<Filters>(filters);
  const [search, setSearch] = React.useState("");
  const [edit, setEdit] = React.useState<EditTarget | null>(null);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.studentNumber.toLowerCase().includes(q),
    );
  }, [rows, search]);

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
        background: K.bgApp,
        color: K.ink,
        fontFamily: K.body,
        padding: 32,
        overflow: "auto",
        animation: "screenIn 0.35s ease both",
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
                color: K.violet,
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
              ...(access.laptop && access.casier
                ? ([["", "Tous"]] as [string, string][])
                : []),
              ...(access.laptop
                ? ([["LAPTOP", "Portable"]] as [string, string][])
                : []),
              ...(access.casier
                ? ([["CASIER", "Casier"]] as [string, string][])
                : []),
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

        {/* Progression par niveau */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.ink3,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Progression par niveau
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12,
            }}
          >
            {byLevel.map((lv) => (
              <div
                key={lv.level}
                style={{
                  background: K.surfaceCool,
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontFamily: K.display,
                    fontWeight: 800,
                    fontSize: 14,
                    color: K.ink,
                  }}
                >
                  Secondaire {lv.level}
                </div>
                {access.casier && (
                  <ProgressLine
                    emoji="🔒"
                    done={lv.casierDone}
                    total={lv.casierTotal}
                    color="#2BB070"
                  />
                )}
                {access.laptop && (
                  <ProgressLine
                    emoji="💻"
                    done={lv.laptopDone}
                    total={lv.laptopTotal}
                    color="#5B2BC9"
                  />
                )}
              </div>
            ))}
          </div>
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

        {/* Recherche rapide */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 16,
            padding: "10px 14px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {Icons.search({ size: 18, stroke: K.ink3 })}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou numéro d'élève…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: K.display,
              color: K.ink,
              background: "transparent",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: K.surfaceCool,
                color: K.ink2,
                borderRadius: 999,
                padding: "5px 10px",
                fontWeight: 800,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ✕ effacer
            </button>
          )}
          <div style={{ fontSize: 12, color: K.ink3, fontWeight: 700 }}>
            {filteredRows.length} / {rows.length}
          </div>
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
                  "Petit casier",
                  "Reçu PDF",
                  "Actions",
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
              {filteredRows.map((r, i) => (
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
                  <td
                    style={{
                      ...td,
                      fontSize: 12.5,
                      fontFamily: K.mono,
                      color: r.petitCasier ? K.ink : K.ink4,
                    }}
                  >
                    {r.typeKey === "CASIER" ? r.petitCasier || "—" : "—"}
                  </td>
                  <td style={td}>
                    {r.typeKey === "LAPTOP" && r.stateKey === "DELIVERED" ? (
                      <PdfCell folio={`AE-26-${r.studentNumber}`} />
                    ) : (
                      <span style={{ color: K.ink4 }}>—</span>
                    )}
                  </td>
                  <td style={td}>
                    {r.typeKey === "CASIER" && canEdit(role) ? (
                      <button
                        onClick={() =>
                          setEdit({
                            studentNumber: r.studentNumber,
                            name: r.name,
                            lockerNumber: r.lockerNumber,
                            combinationCode: r.combinationCode,
                            binomeNumber: r.binomeNumber,
                            binomeName: r.binomeName,
                            petitCasier: r.petitCasier,
                          })
                        }
                        style={editBtnStyle}
                      >
                        ✎ Modifier
                      </button>
                    ) : (
                      <span style={{ color: K.ink4 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    style={{
                      ...td,
                      textAlign: "center",
                      color: K.ink3,
                      padding: 32,
                    }}
                  >
                    {rows.length === 0
                      ? "Aucun résultat pour ces filtres."
                      : "Aucun résultat pour cette recherche."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <CasierEditModal
          target={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const editBtnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "6px 12px",
  background: "#1E3A5F",
  color: "#fff",
  fontFamily: K.display,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  cursor: "pointer",
};

function CasierEditModal({
  target,
  onClose,
  onSaved,
}: {
  target: EditTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [casier, setCasier] = React.useState(target.lockerNumber);
  const [code, setCode] = React.useState(target.combinationCode);
  const [binome, setBinome] = React.useState(target.binomeNumber);
  const [petit, setPetit] = React.useState(target.petitCasier);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(
        `/api/admin/casier/${encodeURIComponent(target.studentNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            casier,
            code,
            binomeNumber: binome,
            petitCasier: petit,
          }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Erreur");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(8,0,31,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: "100%",
          background: "#fff",
          color: K.ink,
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: "#2BB070",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            ● Modifier casier
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 22,
              fontWeight: 800,
              color: K.ink,
              letterSpacing: -0.6,
              marginTop: 2,
            }}
          >
            {target.name}
          </div>
          <div style={{ fontSize: 12, color: K.ink3, marginTop: 2 }}>
            N° {target.studentNumber}
          </div>
        </div>

        <EditField
          label="Casier (numéro)"
          value={casier}
          onChange={setCasier}
          placeholder="ex. 218"
        />
        <EditField
          label="Code du cadenas"
          value={code}
          onChange={setCode}
          placeholder="ex. 12-24-08"
        />
        <EditField
          label={`Binôme (numéro élève)${target.binomeName ? " — actuel: " + target.binomeName : ""}`}
          value={binome}
          onChange={setBinome}
          placeholder="Numéro de l'élève — vide pour aucun"
        />
        <EditField
          label="Petit casier"
          value={petit}
          onChange={setPetit}
          placeholder="ex. PC-04"
        />

        {err && (
          <div
            style={{
              background: K.pinkSoft,
              color: "#B2245A",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn kind="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>
            Annuler
          </Btn>
          <Btn
            kind="primary"
            size="md"
            onClick={submit}
            disabled={busy}
            style={{ flex: 2 }}
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: K.display,
          fontSize: 11,
          fontWeight: 800,
          color: K.ink3,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 46,
          borderRadius: 12,
          border: `2px solid ${K.lineStrong}`,
          padding: "0 14px",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: K.display,
          color: K.ink,
          outline: "none",
          background: K.surfaceCool,
        }}
      />
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

function ProgressLine({
  emoji,
  done,
  total,
  color,
}: {
  emoji: string;
  done: number;
  total: number;
  color: string;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 800,
          color: K.ink2,
          fontFamily: K.display,
        }}
      >
        <span>{emoji}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {done}/{total}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: K.line,
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{ height: "100%", width: `${pct}%`, background: color }}
        />
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
