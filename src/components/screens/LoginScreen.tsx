"use client";
// LoginScreen — shown once at startup. Pick name + initial mode.
// Port of `screen-login-kido.jsx`, wired to NextAuth credentials.
import React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { K, Btn, Icons, LaptopMascot, PadlockMascot, Spinner } from "@/components/ui";

const SCHOOL = {
  name: "Collège Mont-Royal",
  campus: "Campus principal",
  year: "Année scolaire 2025–2026",
};

export default function LoginScreen() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState<"laptop" | "casier">("laptop");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const canStart = name.trim().length > 3 && !loading;

  const onLogin = async () => {
    if (name.trim().length <= 3 || loading) return;
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      name: name.trim(),
      mode,
      redirect: false,
    });
    if (res?.error) {
      setError("Connexion impossible. Vérifiez votre nom.");
      setLoading(false);
      return;
    }
    router.push("/scan");
    router.refresh();
  };

  return (
    <div
      style={{
        height: "100%",
        background: K.bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        fontFamily: K.body,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {[
          { x: 6, y: 10, s: 1.6 },
          { x: 18, y: 78, s: 1.2 },
          { x: 48, y: 6, s: 2.0 },
          { x: 92, y: 14, s: 1.0 },
          { x: 84, y: 64, s: 1.4 },
          { x: 34, y: 48, s: 1.1 },
          { x: 72, y: 82, s: 1.6 },
          { x: 14, y: 34, s: 1.2 },
        ].map((p, i) => (
          <svg
            key={i}
            width={12 * p.s}
            height={12 * p.s}
            viewBox="0 0 12 12"
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 0.35,
            }}
          >
            <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#fff" />
          </svg>
        ))}
      </div>

      <div
        style={{
          width: 640,
          maxWidth: "100%",
          background: "#fff",
          color: K.ink,
          borderRadius: 36,
          padding: 32,
          boxShadow: "0 30px 80px rgba(15,0,60,0.50)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#fff",
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${K.line}`,
              boxShadow:
                "0 4px 0 rgba(15,25,75,0.10), 0 10px 20px rgba(15,25,75,0.15)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cmr-logo.png"
              alt="Collège Mont-Royal"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
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
              ● RemiseCMR · Session
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 22,
                fontWeight: 800,
                color: K.ink,
                letterSpacing: -0.4,
                marginTop: 2,
              }}
            >
              {SCHOOL.name}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: K.ink3,
                fontWeight: 600,
                marginTop: 1,
              }}
            >
              {SCHOOL.campus} · {SCHOOL.year}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: K.line }} />

        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 32,
              fontWeight: 800,
              color: K.ink,
              letterSpacing: -1,
              lineHeight: 1.1,
            }}
          >
            Connexion
          </div>
          <div
            style={{
              fontSize: 14,
              color: K.ink3,
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            Une session par mode. Pour basculer, déconnectez-vous et
            reconnectez-vous dans l&apos;autre mode.
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.ink3,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Votre nom
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marie-Françoise Lévêque"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && canStart) onLogin();
            }}
            style={{
              width: "100%",
              height: 58,
              borderRadius: 18,
              border: `2px solid ${K.lineStrong}`,
              padding: "0 20px",
              fontSize: 17,
              fontWeight: 700,
              fontFamily: K.display,
              color: K.ink,
              outline: "none",
              background: K.surfaceCool,
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.ink3,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Mode de démarrage
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <ModeCard
              active={mode === "laptop"}
              onClick={() => setMode("laptop")}
              label="Laptop"
              sub="Remise d'équipement + signature parent"
              activeColor="#5B2BC9"
              grad={["#B589F0", "#5B2BC9"]}
              mascot={<LaptopMascot size={130} />}
            />
            <ModeCard
              active={mode === "casier"}
              onClick={() => setMode("casier")}
              label="Casier"
              sub="Attribution casier + cadenas (sans signature)"
              activeColor="#2BB070"
              grad={["#6AE3A8", "#2BB070"]}
              mascot={<PadlockMascot size={130} />}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              background: K.pinkSoft,
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

        <Btn
          kind={mode === "casier" ? "success" : "primary"}
          size="lg"
          full
          disabled={!canStart}
          onClick={onLogin}
          icon={
            loading ? (
              <Spinner />
            ) : (
              Icons.check({ size: 22, stroke: "#fff", strokeWidth: 2.5 })
            )
          }
        >
          {loading ? "Connexion…" : "Démarrer la session"}
        </Btn>

        <div
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: K.ink3,
            fontWeight: 600,
            fontFamily: K.mono,
            letterSpacing: 0.4,
            marginTop: 4,
          }}
        >
          Session locale · archivée dans chaque récépissé
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  label,
  sub,
  activeColor,
  grad,
  mascot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  activeColor: string;
  grad: [string, string];
  mascot: React.ReactNode;
}) {
  const [bumpKey, setBumpKey] = React.useState(0);
  const handleClick = () => {
    setBumpKey((k) => k + 1);
    onClick();
  };
  return (
    <button
      onClick={handleClick}
      style={{
        border: "none",
        cursor: "pointer",
        padding: 0,
        borderRadius: 24,
        overflow: "hidden",
        background: active
          ? `linear-gradient(160deg, ${grad[0]} 0%, ${grad[1]} 100%)`
          : K.surfaceCool,
        color: active ? "#fff" : K.ink,
        textAlign: "left",
        boxShadow: active
          ? `0 6px 0 ${activeColor}, 0 14px 28px rgba(27,15,69,0.22)`
          : "0 2px 0 rgba(27,15,69,0.06)",
        transition: "all 0.18s cubic-bezier(0.2,0.8,0.2,1)",
        transform: active ? "translateY(-4px)" : "translateY(0)",
        outline: "none",
        position: "relative",
      }}
    >
      <span
        key={bumpKey}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: 12,
          pointerEvents: "none",
          animation: bumpKey
            ? "badgePop 0.6s cubic-bezier(0.2,0.9,0.3,1.4) both"
            : "none",
          opacity: active ? 1 : 0,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#FFD23F" />
          <path
            d="M 7 12 l 4 4 l 7 -7"
            stroke="#1B0F45"
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <div
        key={`mascot-${bumpKey}`}
        style={{
          height: 150,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          background: active ? "rgba(255,255,255,0.10)" : "#fff",
          position: "relative",
          overflow: "hidden",
          animation: bumpKey
            ? "mascotIn 0.55s cubic-bezier(0.2,0.9,0.3,1.15) both"
            : "none",
        }}
      >
        {active &&
          [
            { x: 14, y: 18, s: 1.0 },
            { x: 80, y: 14, s: 1.4 },
            { x: 90, y: 60, s: 0.9 },
          ].map((p, i) => (
            <svg
              key={i}
              width={10 * p.s}
              height={10 * p.s}
              viewBox="0 0 12 12"
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                opacity: 0.55,
              }}
            >
              <path
                d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z"
                fill="#FFD23F"
              />
            </svg>
          ))}
        <div
          style={{
            transform: active ? "scale(1)" : "scale(0.92)",
            transition: "transform 0.25s cubic-bezier(0.2,0.9,0.3,1.4)",
            filter: active ? "none" : "grayscale(0.4) opacity(0.85)",
          }}
        >
          {mascot}
        </div>
      </div>

      <div style={{ padding: "16px 18px 18px" }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 11,
            fontWeight: 800,
            color: active ? "rgba(255,255,255,0.85)" : K.ink3,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          {active ? "● Sélectionné" : "· Choisir"}
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: -0.5,
            marginTop: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            marginTop: 4,
            color: active ? "rgba(255,255,255,0.82)" : K.ink3,
            lineHeight: 1.3,
          }}
        >
          {sub}
        </div>
      </div>
    </button>
  );
}
