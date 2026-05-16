"use client";
// Scanner — operator home base. Live camera + role-aware queue.
// Port of `screen-scanner-kido.jsx`, wired to the barcode camera + router.
import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { K, Pill, Avatar, Icons, LaptopMascot, PadlockMascot, Btn } from "@/components/ui";
import BarcodeScanner from "@/components/BarcodeScanner";

type Student = {
  id: string;
  code: string;
  first: string;
  last: string;
  group: string;
  box: string;
  paid: boolean;
  status: string;
  color: number;
  deliveredAt: string | null;
};

type Props = {
  queue: Student[];
  delivered: Student[];
  operator: { name: string; role: string; initials: string };
  mode: "laptop" | "casier";
};

export default function ScannerScreen({ queue, delivered, operator, mode }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"pending" | "delivered">("pending");
  const [manual, setManual] = React.useState("");
  const [camError, setCamError] = React.useState("");
  const [scanError, setScanError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState("");

  const pendingCount = queue.length;
  const doneCount = delivered.length;
  const total = pendingCount + doneCount;
  const list = tab === "pending" ? queue : delivered;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d
          .toLocaleString("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
          .toUpperCase(),
      );
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  const goTo = (s: Student) => {
    router.push(mode === "casier" ? `/casier/${s.id}` : `/student/${s.id}`);
  };

  const resolve = async (raw: string) => {
    const v = raw.trim();
    if (!v || busy) return;
    setBusy(true);
    setScanError("");
    const all = [...queue, ...delivered];
    let s: Student | undefined = all.find(
      (x) =>
        x.code.toLowerCase() === v.toLowerCase() ||
        x.id.toLowerCase() === v.toLowerCase() ||
        `${x.first} ${x.last}`.toLowerCase() === v.toLowerCase(),
    );
    if (!s) {
      try {
        const r = await fetch(`/api/students/${encodeURIComponent(v)}`);
        if (r.ok) s = (await r.json()) as Student;
      } catch {
        /* network */
      }
    }
    if (!s) {
      setScanError(`Aucun élève trouvé pour « ${v} »`);
      setBusy(false);
      setTimeout(() => setScanError(""), 3500);
      return;
    }
    goTo(s);
  };

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
                letterSpacing: 0.4,
              }}
            >
              Collège Mont-Royal · Campus principal
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ModeBadge mode={mode} />
          <div
            style={{
              width: 1,
              height: 22,
              background: "rgba(255,255,255,0.18)",
            }}
          />
          <Pill tone="live" icon={<Dot color="#fff" />}>
            VPS · Live
          </Pill>
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
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
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
            }}
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
          label={mode === "casier" ? "Casiers à remettre" : "Laptops en attente"}
          value={pendingCount}
          sub="aujourd'hui"
          tone="cream"
          icon={mode === "casier" ? "🔒" : "💻"}
        />
        <KpiCard
          label={mode === "casier" ? "Casiers remis" : "Laptops remis"}
          value={doneCount}
          sub={`${progress}% complété`}
          tone="green"
          icon="✅"
        />
        <KpiCard
          label={mode === "casier" ? "Total casiers" : "Total programmé"}
          value={total}
          sub={mode === "casier" ? "avec binômes" : "familles"}
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
                  fontSize: 40,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -1.2,
                  lineHeight: 1,
                  marginTop: 6,
                }}
              >
                Scannez le{" "}
                <span
                  style={{ color: mode === "casier" ? "#2BB070" : K.violet }}
                >
                  code élève
                </span>
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
                  ? "Trouvez l'élève pour lui attribuer son casier et son cadenas. Aucune signature requise."
                  : "Pointez la caméra vers le code-barres imprimé sur la carte de l'élève. La détection est automatique."}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {mode === "casier" ? (
                <PadlockMascot size={150} />
              ) : (
                <LaptopMascot size={140} />
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
              minHeight: 280,
            }}
          >
            {/* Live camera (or fallback) */}
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
                inset: 0,
                background:
                  "radial-gradient(60% 40% at 50% 35%, rgba(255,61,139,0.12), transparent 60%), radial-gradient(60% 50% at 80% 80%, rgba(42,212,212,0.12), transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* reticle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: 320,
                height: 320,
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

            {/* status bubble */}
            <div
              style={{
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
              }}
            >
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

            {/* scan error toast */}
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

            {/* manual override */}
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
                  placeholder="Saisir un matricule, un nom ou un code…"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: K.display,
                    letterSpacing: -0.1,
                    width: "100%",
                  }}
                />
              </div>
              <Btn
                kind="cta"
                size="lg"
                icon={Icons.play({ size: 20, stroke: "#fff" })}
                onClick={() => resolve(manual || queue[0]?.code || "")}
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
              <span>● {operator.name}</span>
            </div>
            <div style={{ fontFamily: K.mono, color: K.ink4 }}>
              RemiseCMR · kiosk v1.0
            </div>
          </div>
        </div>

        {/* Right rail — queue */}
        <div
          style={{
            width: 400,
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
                  ? "Aucun élève en attente. 🎉"
                  : "Aucune remise pour l'instant."}
              </div>
            )}
            {list.map((s) => (
              <QueueRow
                key={s.id}
                student={s}
                variant={tab}
                onPick={() => goTo(s)}
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
                letterSpacing: -0.3,
                border: "2px solid #fff",
                boxShadow: "0 2px 0 #2D0F75",
              }}
            >
              {operator.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -0.1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: K.display,
                }}
              >
                {operator.name}
              </div>
              <div
                style={{ fontSize: 11, color: K.ink3, fontWeight: 700 }}
              >
                {operator.role}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                border: "none",
                background: "#fff",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 800,
                color: K.ink2,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                fontFamily: K.display,
                cursor: "pointer",
                boxShadow: "0 2px 0 rgba(27,15,69,0.10)",
              }}
            >
              Sortir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        alt="Collège Mont-Royal"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

function ModeBadge({ mode }: { mode: "laptop" | "casier" }) {
  const m =
    mode === "casier"
      ? { label: "Mode Casier", color: "#6AE3A8" }
      : { label: "Mode Laptop", color: "#B589F0" };
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
      {mode === "casier" ? (
        <svg width="14" height="14" viewBox="0 0 44 44">
          <path
            d="M14 20 Q14 10 22 10 Q30 10 30 20"
            stroke="#fff"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="9" y="20" width="26" height="19" rx="3" fill="#fff" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 44 44">
          <rect x="6" y="12" width="32" height="20" rx="2" fill="#fff" />
          <path d="M4 33 L40 33 L37 38 L7 38 Z" fill="#fff" />
        </svg>
      )}
      {m.label}
    </div>
  );
}

function Dot({ color = "#fff" }: { color?: string }) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: 4,
        background: color,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
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
  const tones: Record<string, any> = {
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
        position: "relative",
        overflow: "hidden",
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
  const offset = c * (1 - value / 100);
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
            strokeDashoffset={offset}
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
            letterSpacing: -0.5,
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
            letterSpacing: -0.3,
            lineHeight: 1.1,
          }}
        >
          Bonne route !
        </div>
      </div>
    </div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map: Record<string, any> = {
    tl: { top: -3, left: -3, borderTop: 5, borderLeft: 5 },
    tr: { top: -3, right: -3, borderTop: 5, borderRight: 5 },
    bl: { bottom: -3, left: -3, borderBottom: 5, borderLeft: 5 },
    br: { bottom: -3, right: -3, borderBottom: 5, borderRight: 5 },
  };
  const m = map[pos];
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
        ...(m.top !== undefined ? { top: m.top } : {}),
        ...(m.bottom !== undefined ? { bottom: m.bottom } : {}),
        ...(m.left !== undefined ? { left: m.left } : {}),
        ...(m.right !== undefined ? { right: m.right } : {}),
        borderTopWidth: m.borderTop || 0,
        borderRightWidth: m.borderRight || 0,
        borderBottomWidth: m.borderBottom || 0,
        borderLeftWidth: m.borderLeft || 0,
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
        boxShadow: active
          ? "0 2px 0 rgba(27,15,69,0.08), 0 6px 14px rgba(27,15,69,0.06)"
          : "none",
        transition: "all 0.15s",
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
  student: Student;
  onPick: () => void;
  variant: "pending" | "delivered";
}) {
  const isDelivered = variant === "delivered";
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
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = K.surfaceCool)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
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
          {student.first} {student.last}
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
          <span>{student.group.split(" — ")[0]}</span>
          <span style={{ color: K.ink4 }}>·</span>
          <span style={{ fontFamily: K.mono }}>{student.box}</span>
        </div>
      </div>
      {isDelivered ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <Pill
            tone="success"
            icon={Icons.check({ size: 12, strokeWidth: 2.5 })}
          >
            Remis
          </Pill>
          {student.deliveredAt && (
            <div
              style={{
                fontSize: 10.5,
                color: K.ink4,
                fontFamily: K.mono,
                fontWeight: 700,
              }}
            >
              {student.deliveredAt}
            </div>
          )}
        </div>
      ) : (
        <>
          {!student.paid && <Pill tone="warn">Solde</Pill>}
          <div style={{ color: K.ink4 }}>{Icons.chev({ size: 18 })}</div>
        </>
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
        { x: 45, y: 22, s: 1.0, o: 0.3 },
        { x: 64, y: 66, s: 1.4, o: 0.5 },
        { x: 86, y: 78, s: 2.0, o: 0.4 },
        { x: 8, y: 78, s: 1.3, o: 0.4 },
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
    "0000000100110000000000",
    "1101011001110011010101",
    "0110001011000010110010",
    "1010111100101101001011",
    "0011001010110001100110",
    "1110011010011100101101",
    "0101100110110010010010",
    "0000000110001011110100",
    "1111111011010101001011",
    "1000001110001101001110",
    "1011101001110010110010",
    "1011101100100111011001",
    "1011101010011000110100",
    "1000001100110101101011",
    "1111111000011010010110",
  ];
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < seed.length; r++) {
    for (let c = 0; c < seed[r].length; c++) {
      if (seed[r][c] === "1")
        cells.push(
          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#fff" />,
        );
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%) rotate(-2deg)",
        width: 180,
        height: 180,
        borderRadius: 18,
        background: "rgba(255,255,255,0.06)",
        padding: 14,
        boxSizing: "border-box",
        opacity: 0.85,
      }}
    >
      <svg viewBox="0 0 22 22" width="100%" height="100%">
        {cells}
      </svg>
    </div>
  );
}
