"use client";
// Scanner — caméra live + file d'attente. Mode laptop ou casier.
import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { K, Pill, Avatar, Icons, LaptopMascot, PadlockMascot, Btn } from "@/components/ui";
import BarcodeScanner from "@/components/BarcodeScanner";
import RoleNav from "@/components/RoleNav";
import type { ClientStudent } from "@/lib/mappers";

type Props = {
  queue: ClientStudent[];
  delivered: ClientStudent[];
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
  queue,
  delivered,
  operatorName,
  mode,
  role,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"pending" | "delivered">("pending");
  const [manual, setManual] = React.useState("");
  const [camError, setCamError] = React.useState("");
  const [scanError, setScanError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState("");
  const [results, setResults] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);

  const pendingCount = queue.length;
  const doneCount = delivered.length;
  const total = pendingCount + doneCount;
  const list = tab === "pending" ? queue : delivered;
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
    const all = [...queue, ...delivered];
    let s = all.find(
      (x) =>
        x.studentNumber.toLowerCase() === v.toLowerCase() ||
        `${x.firstName} ${x.lastName}`.toLowerCase() === v.toLowerCase(),
    );
    if (!s) {
      try {
        const r = await fetch(`/api/students/${encodeURIComponent(v)}`);
        if (r.ok) s = (await r.json()) as ClientStudent;
      } catch {
        /* réseau */
      }
    }
    if (!s) {
      setScanError(`Aucun élève trouvé pour « ${v} »`);
      setBusy(false);
      setTimeout(() => setScanError(""), 3500);
      return;
    }
    goTo(s.studentNumber);
  };

  const accent = mode === "casier" ? "#2BB070" : K.violet;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: K.bg,
        fontFamily: K.body,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StarField />

      {/* Top bar */}
      <div
        style={{
          padding: "22px 32px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo />
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 22,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: -0.6,
                lineHeight: 1,
              }}
            >
              RemiseCMR
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.62)",
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
          <div
            style={{
              fontFamily: K.mono,
              fontSize: 12,
              color: "rgba(255,255,255,0.62)",
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

      {/* KPI row */}
      <div
        style={{
          padding: "18px 32px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 14,
          position: "relative",
          zIndex: 2,
        }}
      >
        <KpiCard
          label={mode === "casier" ? "Casiers à remettre" : "Portables en attente"}
          value={pendingCount}
          sub="aujourd'hui"
          tone="cream"
          icon={mode === "casier" ? "🔒" : "💻"}
        />
        <KpiCard
          label={mode === "casier" ? "Casiers remis" : "Portables remis"}
          value={doneCount}
          sub={`${progress}% complété`}
          tone="green"
          icon="✅"
        />
        <KpiCard
          label="Total programmé"
          value={total}
          sub="élèves"
          tone="violet"
          icon={mode === "casier" ? "🧳" : "🎒"}
        />
        <ProgressCard value={progress} />
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "18px 32px 22px",
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
                  color: mode === "casier" ? "#2BB070" : K.pink,
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
                  fontSize: 38,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -1.2,
                  lineHeight: 1,
                  marginTop: 6,
                }}
              >
                Scannez le <span style={{ color: accent }}>code élève</span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: K.ink3,
                  fontWeight: 600,
                  marginTop: 8,
                  maxWidth: 460,
                }}
              >
                {mode === "casier"
                  ? "Trouvez l'élève pour lui attribuer son casier et son cadenas."
                  : "Pointez la caméra vers le code-barres de la carte de l'élève."}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {mode === "casier" ? (
                <PadlockMascot size={140} />
              ) : (
                <LaptopMascot size={130} />
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
              minHeight: 260,
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

            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: 300,
                height: 300,
                borderRadius: 28,
                border: "3px dashed rgba(255,255,255,0.35)",
                pointerEvents: "none",
              }}
            >
              <Corner pos="tl" />
              <Corner pos="tr" />
              <Corner pos="bl" />
              <Corner pos="br" />
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  right: 14,
                  height: 3,
                  borderRadius: 2,
                  background:
                    "linear-gradient(90deg, transparent, #FFD23F, transparent)",
                  boxShadow: "0 0 18px rgba(255,210,63,0.85)",
                  animation: "scanline 1.6s ease-in-out infinite",
                }}
              />
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
                  padding: "12px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.20)",
                }}
              >
                {Icons.search({ size: 18, stroke: "rgba(255,255,255,0.85)" })}
                <input
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
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: K.display,
                    width: "100%",
                  }}
                />
              </div>
              <Btn
                kind="cta"
                size="lg"
                icon={Icons.play({ size: 20, stroke: "#fff" })}
                onClick={() => resolve(manual)}
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
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
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

          <div
            style={{
              display: "flex",
              padding: 4,
              gap: 4,
              background: K.surfaceCool,
              borderRadius: 14,
              marginBottom: 8,
            }}
          >
            <Tab active={tab === "pending"} onClick={() => setTab("pending")}>
              En attente · {pendingCount}
            </Tab>
            <Tab
              active={tab === "delivered"}
              onClick={() => setTab("delivered")}
            >
              Remis · {doneCount}
            </Tab>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              margin: "0 -6px",
              padding: "4px 6px",
            }}
          >
            {list.length === 0 && (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: K.ink3,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {tab === "pending"
                  ? "Aucun élève en attente."
                  : "Aucune remise pour l'instant."}
              </div>
            )}
            {list.map((s) => (
              <QueueRow
                key={s.id}
                student={s}
                variant={tab}
                onPick={() => goTo(s.studentNumber)}
              />
            ))}
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
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  borderRadius: 999,
  padding: "8px 14px",
  fontFamily: K.display,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  cursor: "pointer",
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
        width: 56,
        height: 56,
        borderRadius: 14,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
        boxShadow: "0 6px 0 rgba(15,25,75,0.45), 0 14px 24px rgba(15,25,75,0.30)",
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
        background: "rgba(255,255,255,0.10)",
        border: `1px solid ${m.color}55`,
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: 11.5,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "#fff",
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
  tone,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "cream" | "green" | "violet";
  icon: string;
}) {
  const tones: Record<string, { bg: string; ink: string }> = {
    cream: { bg: K.surfaceWarm, ink: "#8A5A14" },
    green: { bg: K.greenSoft, ink: "#1F8A47" },
    violet: { bg: "#fff", ink: K.violetDeep },
  };
  const t = tones[tone];
  return (
    <div
      style={{
        background: t.bg,
        borderRadius: 24,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 14px 30px rgba(15,0,60,0.25)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          boxShadow: "0 4px 0 rgba(27,15,69,0.08)",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: t.ink,
            opacity: 0.78,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 36,
            fontWeight: 800,
            color: t.ink,
            letterSpacing: -1.5,
            lineHeight: 1,
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(value).padStart(2, "0")}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: t.ink,
            opacity: 0.65,
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FF3D8B 0%, #FF8C42 100%)",
        borderRadius: 24,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        color: "#fff",
        boxShadow: "0 14px 30px rgba(255,61,139,0.35)",
      }}
    >
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="36"
            cy="36"
            r={r}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            stroke="#fff"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value / 100)}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: K.display,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {value}%
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          Avancement
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 20,
            fontWeight: 800,
            marginTop: 2,
          }}
        >
          Bonne route !
        </div>
      </div>
    </div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const m: Record<string, React.CSSProperties> = {
    tl: { top: -3, left: -3, borderTopWidth: 5, borderLeftWidth: 5 },
    tr: { top: -3, right: -3, borderTopWidth: 5, borderRightWidth: 5 },
    bl: { bottom: -3, left: -3, borderBottomWidth: 5, borderLeftWidth: 5 },
    br: { bottom: -3, right: -3, borderBottomWidth: 5, borderRightWidth: 5 },
  };
  return (
    <div
      style={{
        position: "absolute",
        width: 44,
        height: 44,
        borderRadius: 8,
        borderColor: "#FFD23F",
        borderStyle: "solid",
        borderWidth: 0,
        ...m[pos],
      }}
    />
  );
}

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 14px",
        borderRadius: 10,
        background: active ? "#fff" : "transparent",
        color: active ? K.ink : K.ink3,
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        cursor: "pointer",
        textAlign: "center",
        boxShadow: active ? "0 2px 0 rgba(27,15,69,0.08)" : "none",
      }}
    >
      {children}
    </div>
  );
}

function QueueRow({
  student,
  onPick,
  variant,
}: {
  student: ClientStudent;
  onPick: () => void;
  variant: "pending" | "delivered";
}) {
  return (
    <div
      onClick={onPick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 10px",
        borderRadius: 14,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = K.surfaceCool)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Avatar student={student} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 15,
            fontWeight: 800,
            color: K.ink,
            letterSpacing: -0.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {student.firstName} {student.lastName}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: K.ink3,
            marginTop: 2,
            fontWeight: 700,
            display: "flex",
            gap: 8,
          }}
        >
          <span>{student.group}</span>
          <span style={{ color: K.ink4 }}>·</span>
          <span style={{ fontFamily: K.mono }}>{student.studentNumber}</span>
        </div>
      </div>
      {variant === "delivered" ? (
        <Pill tone="success" icon={Icons.check({ size: 12, strokeWidth: 2.5 })}>
          Remis
        </Pill>
      ) : (
        <div style={{ color: K.ink4 }}>{Icons.chev({ size: 18 })}</div>
      )}
    </div>
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
