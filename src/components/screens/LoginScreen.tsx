"use client";
// LoginScreen — email + password (rôles : SUPER_ADMIN / STAFF_MANAGER / OPERATOR).
import React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { K, Btn, Icons, Spinner, LaptopMascot, PadlockMascot } from "@/components/ui";

const SCHOOL = {
  name: "Collège Mont-Royal",
  campus: "Campus principal",
  year: "Année scolaire 2025–2026",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  // TODO: volver a 8+ en producción
  const canSubmit =
    email.trim().includes("@") && password.length >= 6 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Courriel ou mot de passe incorrect.");
      setLoading(false);
      return;
    }
    // Hard navigation: garantit que le serveur (middleware + pages) lit le
    // cookie de session fraîchement posé — pas de course avec le cache RSC.
    window.location.href = "/";
  };

  return (
    <div
      style={{
        height: "100%",
        background:
          "linear-gradient(180deg, #FFF7EC 0%, #FDEEDC 45%, #F3E7DA 100%)",
        color: K.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        fontFamily: K.body,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <WarmScene />

      <div
        style={{
          width: 460,
          maxWidth: "100%",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: K.ink,
          borderRadius: 32,
          padding: 34,
          boxShadow:
            "0 2px 0 rgba(255,255,255,0.8) inset, 0 30px 70px rgba(120,80,30,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "relative",
          zIndex: 3,
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
                color: K.orange,
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
            Entrez vos identifiants pour accéder au système de remise.
          </div>
        </div>

        <Field label="Courriel">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex. agarcia@collegemont-royal.qc.ca"
            autoFocus
            autoComplete="username"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            style={inputStyle}
          />
        </Field>

        <Field label="Mot de passe">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            style={inputStyle}
          />
        </Field>

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
          kind="warm"
          size="lg"
          full
          disabled={!canSubmit}
          onClick={onSubmit}
          icon={
            loading ? (
              <Spinner />
            ) : (
              Icons.check({ size: 22, stroke: "#fff", strokeWidth: 2.5 })
            )
          }
        >
          {loading ? "Connexion…" : "Se connecter"}
        </Btn>

        <div
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: K.ink3,
            fontWeight: 600,
            fontFamily: K.mono,
            letterSpacing: 0.4,
            marginTop: 2,
          }}
        >
          Accès réservé au personnel autorisé
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 56,
  borderRadius: 16,
  border: `2px solid ${K.lineStrong}`,
  padding: "0 18px",
  fontSize: 16,
  fontWeight: 700,
  fontFamily: K.display,
  color: K.ink,
  outline: "none",
  background: K.surfaceCool,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// Décor chaleureux et apaisant (inspiration « méditation ») — formes douces,
// soleil, nuages, collines en couches, et les mascottes de l'app.
function WarmScene() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Soleil pâle */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          right: "12%",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #FFE7A8 0%, #FFD978 60%, rgba(255,217,120,0) 72%)",
        }}
      />
      {/* Nuages */}
      <Cloud x="14%" y="16%" s={1} />
      <Cloud x="62%" y="9%" s={0.8} />
      <Cloud x="40%" y="22%" s={0.6} />

      {/* Collines en couches (bas de l'écran) */}
      <svg
        viewBox="0 0 1440 520"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "62%",
        }}
      >
        <path
          d="M0 230 Q360 120 720 210 T1440 200 L1440 520 L0 520 Z"
          fill="#EBD9C4"
        />
        <path
          d="M0 320 Q300 230 640 300 T1440 300 L1440 520 L0 520 Z"
          fill="#D9C7E8"
        />
        <path
          d="M0 400 Q420 320 820 390 T1440 380 L1440 520 L0 520 Z"
          fill="#B9A6D6"
        />
        <path
          d="M0 470 Q500 420 980 460 T1440 455 L1440 520 L0 520 Z"
          fill="#9C86C2"
        />
      </svg>

      {/* Mascottes assises sur les collines, de part et d'autre */}
      <div
        style={{
          position: "absolute",
          left: "7%",
          bottom: "14%",
          opacity: 0.96,
        }}
      >
        <LaptopMascot size={150} />
      </div>
      <div
        style={{
          position: "absolute",
          right: "7%",
          bottom: "13%",
          opacity: 0.96,
        }}
      >
        <PadlockMascot size={150} />
      </div>
    </div>
  );
}

function Cloud({ x, y, s }: { x: string; y: string; s: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${s})`,
        display: "flex",
        alignItems: "flex-end",
        filter: "drop-shadow(0 8px 14px rgba(150,120,80,0.10))",
      }}
    >
      <div
        style={{
          width: 90,
          height: 44,
          background: "#FFFDF8",
          borderRadius: 999,
          boxShadow:
            "34px -18px 0 -6px #FFFDF8, 70px 0 0 -4px #FFFDF8",
        }}
      />
    </div>
  );
}
