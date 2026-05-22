"use client";
// Attribution du casier — l'opérateur choisit un casier du catalogue.
// Binôme optionnel. Pas de signature, pas de PDF.
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

type LockerOpt = {
  number: string;
  serialNumber: string;
  combinationCode: string;
};

type Props = {
  student: ClientStudent;
  mode: "assign" | "done";
  assignedLocker: LockerOpt | null;
  binome: ClientStudent | null;
  availableLockers: LockerOpt[];
  operatorName: string;
};

export default function CasierScreen({
  student,
  mode,
  assignedLocker,
  binome,
  availableLockers,
  operatorName,
}: Props) {
  const router = useRouter();
  const isDone = mode === "done";

  const [picked, setPicked] = React.useState<LockerOpt | null>(assignedLocker);
  const [lockerQuery, setLockerQuery] = React.useState("");
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
          `/api/students/search?q=${encodeURIComponent(q)}&excludeId=${encodeURIComponent(student.id)}`,
        );
        if (r.ok) setResults(await r.json());
      } catch {
        /* réseau */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, student.id]);

  // filtre des casiers disponibles
  const lockerMatches = React.useMemo(() => {
    const q = lockerQuery.trim().toLowerCase();
    if (!q) return availableLockers.slice(0, 80);
    return availableLockers
      .filter(
        (l) =>
          l.number.toLowerCase().includes(q) ||
          (l.serialNumber || "").toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [availableLockers, lockerQuery]);

  const confirm = async () => {
    if (busy || !picked) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/casier/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: student.studentNumber,
          lockerNumber: picked.number,
          binomeStudentNumber: selectedBinome?.studentNumber ?? "",
        }),
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
      {/* Gauche : identité + binôme */}
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
              {isDone ? "Casier déjà remis" : "Attribuer le casier"}
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
        {isDone && (
          <Alert
            tone="amber"
            title="Casier déjà attribué"
            text="Cet élève a déjà un casier enregistré dans la base."
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
                {isDone && <Pill tone="success">Casier remis</Pill>}
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

          {selectedBinome ? (
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
                  <span style={{ fontFamily: K.mono }}>
                    {selectedBinome.studentNumber}
                  </span>
                </div>
              </div>
              {!isDone && (
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
                  Retirer
                </button>
              )}
            </div>
          ) : (
            !isDone && (
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

      {/* Droite : sélection / affichage du casier */}
      <div
        style={{
          width: 480,
          padding: "24px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "auto",
        }}
      >
        {!isDone && !picked ? (
          /* ─── Sélecteur de casier ─────────────────────────── */
          <div
            style={{
              background: "#fff",
              color: K.ink,
              borderRadius: 28,
              padding: 22,
              boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
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
                ● Étape 02 · Choisir le casier
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 22,
                  fontWeight: 800,
                  color: K.ink,
                  marginTop: 2,
                }}
              >
                Sélectionnez un casier
              </div>
            </div>

            {availableLockers.length === 0 ? (
              <Alert
                tone="red"
                title="Aucun casier disponible"
                text="Importez le catalogue des casiers depuis Admin › Importer les listes."
              />
            ) : (
              <>
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
                    value={lockerQuery}
                    onChange={(e) => setLockerQuery(e.target.value)}
                    placeholder="N° de casier ou n° de série…"
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
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: K.ink3,
                    fontWeight: 700,
                  }}
                >
                  {availableLockers.length} casier(s) disponible(s)
                </div>
                <div
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${K.line}`,
                    maxHeight: 420,
                    overflow: "auto",
                  }}
                >
                  {lockerMatches.map((l) => (
                    <div
                      key={l.number}
                      onClick={() => setPicked(l)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${K.line}`,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background:
                            "linear-gradient(135deg, #4ED5D5, #1AA0A0)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: K.display,
                          fontWeight: 800,
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {l.number}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: K.display,
                            fontSize: 14,
                            fontWeight: 800,
                            color: K.ink,
                          }}
                        >
                          Casier {l.number}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: K.ink3,
                            fontWeight: 700,
                            fontFamily: K.mono,
                          }}
                        >
                          Série {l.serialNumber || "—"} · Code{" "}
                          {l.combinationCode}
                        </div>
                      </div>
                      {Icons.chev({ size: 18, stroke: K.ink4 })}
                    </div>
                  ))}
                  {lockerMatches.length === 0 && (
                    <div
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: K.ink3,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Aucun casier ne correspond.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ─── Casier choisi / déjà attribué ───────────────── */
          <>
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
                🔒 Casier {isDone ? "attribué" : "sélectionné"}
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
                {picked?.number}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                color: K.ink,
                borderRadius: 24,
                padding: 20,
                boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
              }}
            >
              <KV
                label="N° de série du loker"
                value={picked?.serialNumber || "—"}
                mono
                icon={<TileIcon kind="locker" />}
              />
              <KV
                label="Code du cadenas"
                value={picked?.combinationCode || "—"}
                mono
                icon={<TileIcon kind="sparkle" />}
              />
            </div>

            {!isDone && (
              <button
                onClick={() => {
                  setPicked(null);
                  setLockerQuery("");
                }}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "10px 16px",
                  fontFamily: K.display,
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                ↻ Changer de casier
              </button>
            )}

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
                <strong style={{ color: K.ink }}>{picked?.number}</strong> pour{" "}
                <strong style={{ color: K.ink }}>
                  {student.firstName} {student.lastName}
                </strong>
                {selectedBinome
                  ? ` + binôme ${selectedBinome.firstName} ${selectedBinome.lastName}`
                  : " — sans binôme"}
                .
              </div>

              {isDone ? (
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
                    busy ? (
                      <Spinner />
                    ) : (
                      Icons.check({ size: 22, stroke: "#fff" })
                    )
                  }
                  onClick={confirm}
                >
                  {busy ? "Enregistrement…" : "Confirmer la remise du casier"}
                </Btn>
              )}
            </div>
          </>
        )}
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
              {picked?.number}
            </strong>{" "}
            attribué à {student.firstName} {student.lastName}
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
