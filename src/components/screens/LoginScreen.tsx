"use client";
// LoginScreen — email + password (rôles : SUPER_ADMIN / STAFF_MANAGER / OPERATOR).
import React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { K, Btn, Icons, Spinner } from "@/components/ui";

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
  const canSubmit = email.trim().length > 3 && password.length >= 1 && !loading;

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
          width: 480,
          maxWidth: "100%",
          background: "#fff",
          color: K.ink,
          borderRadius: 36,
          padding: 36,
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
            Entrez vos identifiants pour accéder au système de remise.
          </div>
        </div>

        <Field label="Identifiant">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex. agarcia"
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
          kind="primary"
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
