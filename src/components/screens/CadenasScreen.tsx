"use client";
// Recherche cadenas — par n° de série ou n° de casier.
// Accessible à tout utilisateur connecté (opérateurs, gestionnaires, admins).
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, Icons, Spinner } from "@/components/ui";

type Sib = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  level: string;
};
type LockerResult = {
  number: string;
  serialNumber: string | null;
  combinationCode: string;
  status: string;
  studentA: Sib | null;
  studentB: Sib | null;
};

export default function CadenasScreen() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<LockerResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/lockers/lookup?q=${encodeURIComponent(term)}`,
        );
        if (r.ok) setResults(await r.json());
        setHasSearched(true);
      } catch {
        /* réseau */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div
      style={{
        height: "100%",
        background: K.bg,
        color: "#fff",
        fontFamily: K.body,
        padding: 40,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
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
                color: "#B589F0",
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              ● RemiseCMR · Recherche cadenas
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
              Recherche d&apos;un cadenas
            </div>
          </div>
          <Btn
            kind="ghostDark"
            size="md"
            icon={Icons.back({ size: 20, stroke: "#fff" })}
            onClick={() => router.back()}
          >
            Retour
          </Btn>
        </div>

        {/* Barre de recherche */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 18,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: `2px solid ${K.lineStrong}`,
            boxShadow: "0 14px 30px rgba(15,0,60,0.25)",
          }}
        >
          {Icons.search({ size: 24, stroke: K.ink3 })}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° de série du cadenas ou n° de casier…"
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: K.display,
              fontSize: 18,
              fontWeight: 700,
              color: K.ink,
            }}
          />
          {searching && <Spinner />}
        </div>

        {/* Résultats */}
        {hasSearched && results.length === 0 && (
          <div
            style={{
              background: "#fff",
              color: K.ink3,
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Aucun cadenas ne correspond à « {q.trim()} ».
          </div>
        )}

        {results.length > 0 && (
          <>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 700,
                marginBottom: 8,
                fontFamily: K.mono,
              }}
            >
              {results.length} résultat(s)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((l) => (
                <LockerCard key={l.number} l={l} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LockerCard({ l }: { l: LockerResult }) {
  const isDelivered = l.status === "DELIVERED";
  return (
    <div
      style={{
        background: "#fff",
        color: K.ink,
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 14px 30px rgba(15,0,60,0.25)",
        display: "flex",
        gap: 18,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 18,
          background: "linear-gradient(135deg, #4ED5D5, #1AA0A0)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: K.display,
          fontWeight: 800,
          fontSize: 32,
          flexShrink: 0,
          letterSpacing: -1,
        }}
      >
        {l.number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: K.display,
              fontSize: 16,
              fontWeight: 800,
              color: K.ink,
            }}
          >
            Casier {l.number}
          </span>
          {isDelivered ? (
            <Pill tone="success">Assigné</Pill>
          ) : (
            <Pill tone="primary">Disponible</Pill>
          )}
        </div>
        <div
          style={{
            fontFamily: K.mono,
            fontSize: 13,
            color: K.ink2,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          Série : <strong>{l.serialNumber || "—"}</strong>
          <br />
          Code&nbsp;: <strong>{l.combinationCode}</strong>
        </div>
        {(l.studentA || l.studentB) && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${K.line}`,
              fontSize: 13,
              color: K.ink2,
              fontWeight: 700,
              lineHeight: 1.7,
            }}
          >
            {l.studentA && (
              <div>
                👤 {l.studentA.firstName} {l.studentA.lastName} ·{" "}
                <span style={{ fontFamily: K.mono }}>
                  {l.studentA.studentNumber}
                </span>{" "}
                · {l.studentA.group}
              </div>
            )}
            {l.studentB && (
              <div>
                👥 Binôme : {l.studentB.firstName} {l.studentB.lastName} ·{" "}
                <span style={{ fontFamily: K.mono }}>
                  {l.studentB.studentNumber}
                </span>{" "}
                · {l.studentB.group}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
