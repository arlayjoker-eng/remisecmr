"use client";
// Attribution du casier — flux CASIER (pas de signature). Binôme optionnel.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, KV, Avatar, TileIcon, Icons, Spinner } from "@/components/ui";
import { Alert } from "@/components/screens/StudentScreen";
import type { ClientStudent } from "@/lib/mappers";

type SearchResult = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  level: string;
};

type Props = {
  student: ClientStudent;
  owner: ClientStudent;
  binome: ClientStudent | null;
  viaBinome: boolean;
  locker: { number: string; combinationCode: string; status: string };
  operatorName: string;
};

export default function CasierScreen({
  student,
  owner,
  binome,
  viaBinome,
  locker,
  operatorName,
}: Props) {
  const router = useRouter();
  const alreadyDelivered = locker.status === "DELIVERED";

  const [selectedBinome, setSelectedBinome] = React.useState<
    ClientStudent | SearchResult | null
  >(binome);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState("");

  // recherche binôme (debounce)
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/students/search?q=${encodeURIComponent(q)}&excludeId=${encodeURIComponent(owner.id)}`,
        );
        if (r.ok) setResults(await r.json());
      } catch {
        /* réseau */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, owner.id]);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const body: Record<string, string> = {
      studentNumber: student.studentNumber,
    };
    if (!viaBinome) {
      body.binomeStudentNumber = selectedBinome?.studentNumber ?? "";
    }
    try {
      const res = await fetch("/api/casier/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Échec de la remise.");
      setSuccess(true);
      setTimeout(() => {
        router.push("/scan?mode=casier");
        router.refresh();
      }, 2200);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: K.bg,
        color: "#fff",
        fontFamily: K.body,
        position: "relative",
      }}
    >
      {/* Left: identité + binôme */}
      <div
        style={{
          flex: 1,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "auto",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push("/scan?mode=casier")}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "none",
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icons.back({ size: 22, stroke: "#fff" })}
          </button>
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: "#6AE3A8",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              ● Mode Casier · {operatorName}
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 22,
                fontWeight: 800,
                marginTop: 2,
              }}
            >
              {viaBinome
                ? "Casier partagé · binôme"
                : alreadyDelivered
                  ? "Casier déjà remis"
                  : "Attribuer le casier"}
            </div>
          </div>
        </div>

        {!student.receivesLocker && (
          <Alert
            tone="red"
            title="Cet élève ne reçoit pas de casier"
            text="Selon le CSV importé, cet élève n'est pas sur la liste des casiers."
          />
        )}
        {alreadyDelivered && (
          <Alert
            tone="amber"
            title="Casier déjà remis"
            text="Ce casier a déjà été attribué et marqué comme remis."
          />
        )}
        {viaBinome && (
          <Alert
            tone="amber"
            title={`Casier partagé avec ${owner.firstName} ${owner.lastName}`}
            text="Cet élève est le binôme. Même casier, même code."
          />
        )}

        {/* Identité */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 22,
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 14,
            }}
          >
            <Avatar student={student} size={80} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 11,
                  fontWeight: 800,
                  color: K.violet,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {student.group} · Secondaire {student.level}
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 26,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -0.8,
                  marginTop: 4,
                }}
              >
                {student.firstName} {student.lastName}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Pill tone="primary">{student.studentNumber}</Pill>
                {viaBinome && <Pill tone="warn">Binôme</Pill>}
                {alreadyDelivered && (
                  <Pill tone="success">Casier remis</Pill>
                )}
              </div>
            </div>
          </div>

          <KV
            label="Numéro d'élève"
            value={student.studentNumber}
            mono
            icon={<TileIcon kind="badge" />}
          />
          <KV
            label="Groupe / Niveau"
            value={`${student.group} · Secondaire ${student.level}`}
            icon={<TileIcon kind="backpack" />}
          />
          <KV
            label="Courriel"
            value={student.email || "—"}
            icon={<TileIcon kind="family" />}
          />
        </div>

        {/* Binôme */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 22,
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
          }}
        >
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.ink3,
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            ● Binôme (optionnel)
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 20,
              fontWeight: 800,
              color: K.ink,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            {selectedBinome ? "2ᵉ élève du casier" : "Aucun binôme"}
          </div>

          {viaBinome ? (
            <div
              style={{
                padding: "16px",
                borderRadius: 16,
                background: K.surfaceCool,
                fontSize: 13,
                color: K.ink3,
                fontWeight: 600,
              }}
            >
              Le binôme se gère depuis la fiche de l&apos;élève principal (
              {owner.firstName} {owner.lastName}).
            </div>
          ) : selectedBinome ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 18,
                background: K.surfaceCool,
                border: `2px dashed ${K.lineStrong}`,
              }}
            >
              <Avatar student={selectedBinome} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: K.display,
                    fontSize: 16,
                    fontWeight: 800,
                    color: K.ink,
                  }}
                >
                  {selectedBinome.firstName} {selectedBinome.lastName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: K.ink3,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {(selectedBinome as SearchResult).group} ·{" "}
                  <span style={{ fontFamily: K.mono }}>
                    {selectedBinome.studentNumber}
                  </span>
                </div>
              </div>
              {!alreadyDelivered && (
                <button
                  onClick={() => setSelectedBinome(null)}
                  style={{
                    border: "none",
                    background: K.pinkSoft,
                    color: "#B2245A",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontFamily: K.display,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Retirer le binôme
                </button>
              )}
            </div>
          ) : (
            !alreadyDelivered && (
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: K.surfaceCool,
                    borderRadius: 14,
                    padding: "12px 14px",
                    border: `2px solid ${K.lineStrong}`,
                  }}
                >
                  {Icons.search({ size: 18, stroke: K.ink3 })}
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Chercher un binôme (nom, numéro, groupe)…"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontFamily: K.display,
                      fontSize: 15,
                      fontWeight: 700,
                      color: K.ink,
                    }}
                  />
                  {searching && <Spinner />}
                </div>
                {results.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 14,
                      border: `1px solid ${K.line}`,
                      maxHeight: 240,
                      overflow: "auto",
                    }}
                  >
                    {results.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedBinome(r);
                          setQuery("");
                          setResults([]);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderBottom: `1px solid ${K.line}`,
                        }}
                      >
                        <Avatar student={r} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: K.display,
                              fontSize: 14,
                              fontWeight: 800,
                              color: K.ink,
                            }}
                          >
                            {r.firstName} {r.lastName}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: K.ink3,
                              fontWeight: 700,
                            }}
                          >
                            {r.group} ·{" "}
                            <span style={{ fontFamily: K.mono }}>
                              {r.studentNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div style={{ flex: 1 }} />
      </div>

      {/* Right: casier + code + confirmer */}
      <div
        style={{
          width: 480,
          padding: "24px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Casier hero */}
        <div
          style={{
            background: "linear-gradient(135deg, #4ED5D5 0%, #1AA0A0 100%)",
            borderRadius: 28,
            padding: 24,
            color: "#fff",
            boxShadow:
              "0 6px 0 rgba(13,80,80,0.45), 0 24px 60px rgba(26,160,160,0.35)",
          }}
        >
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            🔒 Casier assigné
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
              marginTop: 6,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {locker.number}
          </div>
        </div>

        {/* Code */}
        <div
          style={{
            background: "linear-gradient(135deg, #FFD56B 0%, #FF9A2E 100%)",
            borderRadius: 28,
            padding: 24,
            color: "#1B0F45",
            boxShadow: "0 6px 0 rgba(198,101,38,0.55)",
          }}
        >
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            🔑 Code du cadenas
          </div>
          <div
            style={{
              fontFamily: K.mono,
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: 2,
              marginTop: 6,
            }}
          >
            {locker.combinationCode}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fff",
              color: "#B2245A",
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Résumé + confirmer */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: K.ink3, fontWeight: 700 }}>
            Résumé : casier{" "}
            <strong style={{ color: K.ink }}>{locker.number}</strong> pour{" "}
            <strong style={{ color: K.ink }}>
              {owner.firstName} {owner.lastName}
            </strong>
            {selectedBinome
              ? ` + binôme ${selectedBinome.firstName} ${selectedBinome.lastName}`
              : " — sans binôme"}
            .
          </div>

          {alreadyDelivered ? (
            <Btn
              kind="ghost"
              size="lg"
              full
              icon={Icons.back({ size: 22 })}
              onClick={() => router.push("/scan?mode=casier")}
            >
              Retour au scanner
            </Btn>
          ) : (
            <Btn
              kind="success"
              size="lg"
              full
              disabled={busy}
              icon={
                busy ? <Spinner /> : Icons.check({ size: 22, stroke: "#fff" })
              }
              onClick={confirm}
            >
              {busy
                ? "Enregistrement…"
                : selectedBinome
                  ? "Confirmer la remise du casier"
                  : "Pas de binôme — confirmer seul"}
            </Btn>
          )}
        </div>
      </div>

      {success && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 70,
            background: "rgba(8,0,31,0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            animation: "overlayIn 0.3s ease both",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 36,
              background: "linear-gradient(135deg, #6AE3A8, #2BB070)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "mascotIn 0.6s cubic-bezier(0.2,0.9,0.3,1.15) both",
              boxShadow: "0 8px 0 #1F8A47",
            }}
          >
            {Icons.check({ size: 64, stroke: "#fff", strokeWidth: 3 })}
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 44,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -1.2,
            }}
          >
            Casier remis !
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 420,
            }}
          >
            <strong style={{ color: "#FFD23F", fontFamily: K.mono }}>
              {locker.number}
            </strong>{" "}
            attribué à {owner.firstName} {owner.lastName}
            {selectedBinome
              ? ` et ${selectedBinome.firstName} ${selectedBinome.lastName}`
              : ""}
            . Enregistré dans la base.
          </div>
        </div>
      )}
    </div>
  );
}
