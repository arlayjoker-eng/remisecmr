"use client";
// Scanner — caméra live + file d'attente. Mode laptop ou casier.
import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { K, Icons, LaptopMascot, PadlockMascot, Btn } from "@/components/ui";
import BarcodeScanner from "@/components/BarcodeScanner";
import RoleNav from "@/components/RoleNav";
import type { ClientStudent } from "@/lib/mappers";

type Props = {
  pendingCount: number;
  deliveredCount: number;
  operatorName: string;
  mode: "laptop" | "casier";
  role: string;
};

type SearchHit = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  level: string;
};

export default function ScannerScreen({
  pendingCount,
  deliveredCount,
  operatorName,
  mode,
  role,
}: Props) {
  const router = useRouter();
  const [manual, setManual] = React.useState("");
  const [camError, setCamError] = React.useState("");
  const [scanError, setScanError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState("");
  const [results, setResults] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [incoming, setIncoming] = React.useState<
    {
      announcedAt: string;
      claimedBy: string | null;
      claimedByName: string | null;
      student: {
        studentNumber: string;
        firstName: string;
        lastName: string;
        group: string;
        level: string;
        boxNumber: string | null;
      };
    }[]
  >([]);
  const [myId, setMyId] = React.useState<string>("");

  // Poll des annonces de la réception (mode laptop uniquement)
  React.useEffect(() => {
    if (mode !== "laptop") return;
    const fetchIncoming = async () => {
      try {
        const r = await fetch("/api/reception/incoming");
        if (r.ok) setIncoming(await r.json());
      } catch {
        /* réseau */
      }
    };
    fetchIncoming();
    const t = setInterval(fetchIncoming, 5000);
    return () => clearInterval(t);
  }, [mode]);

  // Mon identifiant (pour savoir quelles prises en charge sont les miennes)
  React.useEffect(() => {
    if (mode !== "laptop") return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.id && setMyId(j.id))
      .catch(() => {});
  }, [mode]);

  // Prendre en charge un élève annoncé puis ouvrir sa fiche.
  const takeIncoming = async (studentNumber: string) => {
    try {
      const r = await fetch("/api/reception/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setScanError(j?.error || "Déjà pris en charge.");
        setTimeout(() => setScanError(""), 3500);
        return;
      }
    } catch {
      /* réseau — on ouvre quand même la fiche */
    }
    router.push(`/student/${encodeURIComponent(studentNumber)}`);
  };

  const doneCount = deliveredCount;
  const total = pendingCount + doneCount;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  React.useEffect(() => {
    const tick = () =>
      setNow(
        new Date()
          .toLocaleString("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
          .toUpperCase(),
      );
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  // Recherche par nom/numéro — debounce 300 ms vers /api/students/search.
  React.useEffect(() => {
    const q = manual.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/students/search?q=${encodeURIComponent(q)}`,
        );
        setResults(r.ok ? ((await r.json()) as SearchHit[]) : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [manual]);

  const goTo = (studentNumber: string) => {
    router.push(
      mode === "casier"
        ? `/casier/${encodeURIComponent(studentNumber)}`
        : `/student/${encodeURIComponent(studentNumber)}`,
    );
  };

  const resolve = async (raw: string) => {
    const v = raw.trim();
    if (!v || busy) return;
    setBusy(true);
    setScanError("");
    // Chargement par scan (CN-001) : une requête = un élève, jamais le roster.
    let s: ClientStudent | undefined;
    try {
      const r = await fetch(`/api/students/${encodeURIComponent(v)}`);
      if (r.ok) s = (await r.json()) as ClientStudent;
    } catch {
      /* réseau */
    }
    if (!s) {
      setScanError(`Aucun élève trouvé pour « ${v} »`);
      setBusy(false);
      setTimeout(() => setScanError(""), 3500);
      return;
    }
    goTo(s.studentNumber);
  };

  const accent = mode === "casier" ? "#2BB070" : "#1E3A5F";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#FAFAF9",
        fontFamily: K.body,
        color: K.ink,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        .kiosk-search-input::placeholder { color: #FFEB00; opacity: 0.65; font-weight: 800; }
        @keyframes mascotGreet {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          18%      { transform: translateY(-7px) rotate(-7deg); }
          36%      { transform: translateY(0) rotate(6deg); }
          54%      { transform: translateY(-5px) rotate(-5deg); }
          72%      { transform: translateY(0) rotate(4deg); }
        }
      `}</style>

      {/* Top bar */}
      <div
        style={{
          padding: "12px 32px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo />
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 17,
                fontWeight: 800,
                color: K.ink,
                letterSpacing: -0.5,
                lineHeight: 1,
              }}
            >
              RemiseCMR
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: K.ink3,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              Collège Mont-Royal · Campus principal
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ModeBadge mode={mode} />
          <button
            onClick={() => router.push("/scan")}
            style={chipBtnStyle}
          >
            Changer de mode
          </button>
          <button
            onClick={() => router.push("/cadenas")}
            style={chipBtnStyle}
          >
            🔎 Cadenas
          </button>
          <div
            style={{
              fontFamily: K.mono,
              fontSize: 12,
              color: K.ink3,
              fontWeight: 600,
            }}
          >
            {now}
          </div>
          <RoleNav role={role} current="scan" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={chipBtnStyle}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* KPI row — 4 cartes compactes, style unifié corail */}
      <div
        style={{
          padding: "14px 32px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
          position: "relative",
          zIndex: 2,
        }}
      >
        <KpiCard
          label={
            mode === "casier" ? "Casiers à remettre" : "Portables à remettre"
          }
          value={String(pendingCount).padStart(2, "0")}
          sub="aujourd'hui"
          icon={
            mode === "casier"
              ? Icons.box({ size: 22, stroke: "rgba(255,255,255,0.92)" })
              : Icons.device({ size: 22, stroke: "rgba(255,255,255,0.92)" })
          }
        />
        <KpiCard
          label={mode === "casier" ? "Casiers remis" : "Portables remis"}
          value={String(doneCount).padStart(2, "0")}
          sub={`${progress}% complété`}
          icon={Icons.check({ size: 22, stroke: "rgba(255,255,255,0.92)" })}
        />
        <KpiCard
          label="Total programmé"
          value={String(total).padStart(2, "0")}
          sub="élèves programmés"
          icon={Icons.group({ size: 22, stroke: "rgba(255,255,255,0.92)" })}
        />
        <KpiCard
          label="Avancement"
          value={`${progress}%`}
          sub="Bonne route !"
          icon={<MiniRing value={progress} />}
        />
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "14px 32px 22px",
          display: "flex",
          gap: 16,
          minHeight: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Scanner card */}
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 32,
            padding: 24,
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.20) inset, 0 24px 60px rgba(15,0,60,0.35)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 11,
                  fontWeight: 800,
                  color: mode === "casier" ? "#2BB070" : "#1E3A5F",
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                }}
              >
                ● Étape 01 ·{" "}
                {mode === "casier" ? "Attribution casier" : "Identification"}
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 26,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -0.8,
                  lineHeight: 1,
                  marginTop: 5,
                }}
              >
                Scannez le <span style={{ color: accent }}>code élève</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: K.ink3,
                  fontWeight: 600,
                  marginTop: 6,
                  maxWidth: 460,
                }}
              >
                {mode === "casier"
                  ? "Trouvez l'élève pour lui attribuer son casier et son cadenas."
                  : "Pointez la caméra vers le code-barres de la carte de l'élève."}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                transformOrigin: "bottom center",
                animation: "mascotGreet 2.6s ease-in-out infinite",
              }}
            >
              {mode === "casier" ? (
                <PadlockMascot size={92} />
              ) : (
                <LaptopMascot size={86} />
              )}
            </div>
          </div>

          {/* Camera viewport */}
          <div
            style={{
              flex: 1,
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              background: "linear-gradient(180deg, #2D0F75 0%, #1B0945 100%)",
              minHeight: 340,
            }}
          >
            <div style={{ position: "absolute", inset: 0 }}>
              {camError ? (
                <>
                  <StarField dense />
                  <MockQR />
                </>
              ) : (
                <BarcodeScanner
                  onDetected={resolve}
                  onError={(m) => setCamError(m)}
                />
              )}
            </div>

            <div style={statusBubbleStyle}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: camError ? K.red : "#FFD23F",
                  boxShadow: `0 0 10px ${camError ? K.red : "#FFD23F"}`,
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
              {camError ? "Caméra indisponible" : "Caméra active"}
            </div>

            {scanError && (
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: K.red,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  fontFamily: K.display,
                }}
              >
                {scanError}
              </div>
            )}

            {(results.length > 0 || (searching && manual.trim().length >= 2)) && (
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  bottom: 82,
                  maxHeight: 240,
                  overflowY: "auto",
                  borderRadius: 18,
                  background: "rgba(20,8,52,0.92)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 18px 44px rgba(0,0,0,0.5)",
                  padding: 6,
                  zIndex: 5,
                }}
              >
                {searching && results.length === 0 && (
                  <div
                    style={{
                      padding: "14px 16px",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Recherche…
                  </div>
                )}
                {!searching && results.length === 0 && (
                  <div
                    style={{
                      padding: "14px 16px",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Aucun élève trouvé.
                  </div>
                )}
                {results.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setManual("");
                      setResults([]);
                      goTo(s.studentNumber);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "none",
                      background: "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.10)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: K.display,
                          fontSize: 15,
                          fontWeight: 800,
                          letterSpacing: -0.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.firstName} {s.lastName}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: 700,
                          marginTop: 2,
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <span>{s.group}</span>
                        <span style={{ opacity: 0.5 }}>·</span>
                        <span style={{ fontFamily: K.mono }}>
                          {s.studentNumber}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)" }}>
                      {Icons.chev({ size: 18 })}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: 18,
                right: 18,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 18px",
                  borderRadius: 999,
                  background: "#1a1a1a",
                  border: "1.5px solid rgba(255,235,0,0.55)",
                  boxShadow:
                    "0 0 18px rgba(255,235,0,0.35), inset 0 0 6px rgba(255,235,0,0.25)",
                }}
              >
                {Icons.search({ size: 18, stroke: "#FFEB00" })}
                <input
                  className="kiosk-search-input"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") resolve(manual);
                  }}
                  placeholder="Saisir un numéro d'élève ou un nom…"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#FFEB00",
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: K.display,
                    letterSpacing: 0.2,
                    width: "100%",
                  }}
                />
              </div>
              <Btn
                kind="cta"
                size="md"
                icon={Icons.play({ size: 16, stroke: "#fff" })}
                onClick={() => resolve(manual)}
                style={{
                  background:
                    "linear-gradient(135deg, #FF6B4A 0%, #E63946 100%)",
                  boxShadow:
                    "0 5px 0 #B5232E, 0 12px 24px rgba(230,57,70,0.38)",
                }}
              >
                Rechercher
              </Btn>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: K.ink3,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <span>● Caméra arrière</span>
              <span>● Détection 1D + QR</span>
              <span>● {operatorName}</span>
            </div>
            <div style={{ fontFamily: K.mono, color: K.ink4 }}>
              RemiseCMR · kiosk v2.0
            </div>
          </div>
        </div>

        {/* Queue */}
        <div
          style={{
            width: 380,
            background: "#fff",
            borderRadius: 32,
            padding: 22,
            boxShadow: K.shadowCard,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {mode === "laptop" && (
            <div
              style={{
                background:
                  incoming.length > 0
                    ? "linear-gradient(135deg, #FFD56B 0%, #FF9A2E 100%)"
                    : K.surfaceCool,
                borderRadius: 18,
                padding: "12px 14px",
                marginBottom: 14,
                color: incoming.length > 0 ? "#5B2BC9" : K.ink3,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: K.display,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: incoming.length > 0 ? 8 : 0,
                }}
              >
                <span>🔔 En route (réception)</span>
                <span
                  style={{
                    background:
                      incoming.length > 0 ? "#5B2BC9" : "rgba(0,0,0,0.08)",
                    color: incoming.length > 0 ? "#fff" : K.ink3,
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                  }}
                >
                  {incoming.length}
                </span>
              </div>
              {incoming.length === 0 ? null : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {incoming.map((it) => {
                    const claimedByOther =
                      !!it.claimedBy && it.claimedBy !== myId;
                    const mine = !!it.claimedBy && it.claimedBy === myId;
                    return (
                      <div
                        key={it.student.studentNumber}
                        onClick={() =>
                          claimedByOther
                            ? undefined
                            : takeIncoming(it.student.studentNumber)
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          background: claimedByOther
                            ? "rgba(255,255,255,0.30)"
                            : "rgba(255,255,255,0.55)",
                          borderRadius: 10,
                          cursor: claimedByOther ? "not-allowed" : "pointer",
                          opacity: claimedByOther ? 0.55 : 1,
                          border: mine
                            ? "2px solid #5B2BC9"
                            : "2px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "#5B2BC9",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 10,
                            flexShrink: 0,
                          }}
                        >
                          Sec {it.student.level}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: K.display,
                              fontWeight: 800,
                              fontSize: 13,
                              color: K.ink,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {it.student.firstName} {it.student.lastName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: K.ink3,
                              fontWeight: 700,
                              fontFamily: K.mono,
                            }}
                          >
                            {it.student.boxNumber
                              ? `📦 Boîte ${it.student.boxNumber} · `
                              : ""}
                            {new Date(it.announcedAt).toLocaleTimeString(
                              "fr-FR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                          {claimedByOther && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "#C66526",
                                fontWeight: 800,
                                marginTop: 2,
                              }}
                            >
                              🔧 En préparation par {it.claimedByName}
                            </div>
                          )}
                          {mine && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "#5B2BC9",
                                fontWeight: 800,
                                marginTop: 2,
                              }}
                            >
                              🔧 Vous préparez
                            </div>
                          )}
                        </div>
                        {!claimedByOther && Icons.chev({ size: 16, stroke: K.ink3 })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
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
              File du jour
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 30,
                fontWeight: 800,
                color: K.ink,
                letterSpacing: -0.8,
                lineHeight: 1.05,
                marginTop: 6,
              }}
            >
              {pendingCount} élèves
              <br />
              <span style={{ color: K.ink3, fontSize: 18 }}>en attente</span>
            </div>
          </div>

          {/* Chargement par scan (CN-001) : plus de liste complète sur le
              poste. On scanne ou on cherche un élève à la fois. */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              textAlign: "center",
              color: K.ink3,
              padding: "20px 6px",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                background: K.surfaceCool,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
              }}
            >
              🔍
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 15,
                color: K.ink2,
                fontWeight: 800,
              }}
            >
              Scannez ou cherchez un élève
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, maxWidth: 240 }}>
              La liste complète n'est plus chargée sur le poste. Scannez le code
              ou tapez un nom / numéro pour ouvrir une fiche.
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              background: K.surfaceCool,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: K.violet,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: K.display,
                fontWeight: 800,
                fontSize: 13,
                border: "2px solid #fff",
                boxShadow: "0 2px 0 #2D0F75",
              }}
            >
              {operatorName
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0] || "")
                .join("")
                .toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: K.ink,
                  fontFamily: K.display,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {operatorName}
              </div>
              <div style={{ fontSize: 11, color: K.ink3, fontWeight: 700 }}>
                {mode === "casier" ? "Mode Casier" : "Mode Portable"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const chipBtnStyle: React.CSSProperties = {
  border: "none",
  background: "#1E3A5F",
  color: "#fff",
  borderRadius: 999,
  padding: "12px 18px",
  minHeight: 44, // taille tactile iPad
  fontFamily: K.display,
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 3px 0 rgba(15,25,75,0.25)",
};

const statusBubbleStyle: React.CSSProperties = {
  position: "absolute",
  top: 18,
  left: 18,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.14)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  fontFamily: K.display,
};

function Logo() {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 11,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 5,
        boxShadow: "0 4px 0 rgba(15,25,75,0.40), 0 10px 18px rgba(15,25,75,0.25)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cmr-logo.png"
        alt="CMR"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

function ModeBadge({ mode }: { mode: "laptop" | "casier" }) {
  const m =
    mode === "casier"
      ? { label: "Mode Casier", color: "#6AE3A8" }
      : { label: "Mode Portable", color: "#B589F0" };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: "#F1F0EE",
        border: `1px solid ${m.color}55`,
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: 11.5,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: K.ink,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: m.color,
          boxShadow: `0 0 10px ${m.color}`,
        }}
      />
      {m.label}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FF6B4A 0%, #E63946 100%)",
        borderRadius: 16,
        padding: "12px 16px",
        maxHeight: 90,
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "#fff",
        boxShadow: "0 10px 24px rgba(230,57,70,0.30)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            opacity: 0.85,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: -0.8,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            opacity: 0.8,
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function MiniRing({ value }: { value: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx="17"
        cy="17"
        r={r}
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="4"
        fill="none"
      />
      <circle
        cx="17"
        cy="17"
        r={r}
        stroke="#fff"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
      />
    </svg>
  );
}

function StarField({ dense = false }: { dense?: boolean }) {
  const stars = dense
    ? [
        { x: 12, y: 18, s: 1.5, o: 0.6 },
        { x: 78, y: 14, s: 2.2, o: 0.5 },
        { x: 92, y: 36, s: 1.2, o: 0.4 },
        { x: 18, y: 48, s: 1.6, o: 0.5 },
        { x: 64, y: 66, s: 1.4, o: 0.5 },
        { x: 86, y: 78, s: 2.0, o: 0.4 },
      ]
    : [
        { x: 6, y: 12, s: 1.4, o: 0.45 },
        { x: 24, y: 6, s: 2.0, o: 0.4 },
        { x: 48, y: 4, s: 1.2, o: 0.5 },
        { x: 72, y: 10, s: 1.6, o: 0.4 },
        { x: 94, y: 16, s: 1.0, o: 0.5 },
        { x: 14, y: 40, s: 1.2, o: 0.35 },
        { x: 88, y: 48, s: 1.4, o: 0.4 },
      ];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {stars.map((p, i) => (
        <svg
          key={i}
          width={12 * p.s}
          height={12 * p.s}
          viewBox="0 0 12 12"
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.o,
          }}
        >
          <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#fff" />
        </svg>
      ))}
    </div>
  );
}

function MockQR() {
  const seed = [
    "1111111011010101111111",
    "1000001000110100100001",
    "1011101001011001011101",
    "1011101100111101011101",
    "1011101010110001011101",
    "1000001011001101000001",
    "1111111010101011111111",
  ];
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < seed.length; r++)
    for (let c = 0; c < seed[r].length; c++)
      if (seed[r][c] === "1")
        cells.push(
          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#fff" />,
        );
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        width: 150,
        height: 48,
        opacity: 0.7,
      }}
    >
      <svg viewBox="0 0 22 7" width="100%" height="100%">
        {cells}
      </svg>
    </div>
  );
}
