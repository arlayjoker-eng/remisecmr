"use client";
// Saving progress overlay — animated upload checklist.
// Port of `saving-progress-kido.jsx`.
import React from "react";
import { K, Icons } from "@/components/ui";

const C = K;

export default function SavingProgress({
  folio,
  onDone,
}: {
  folio: string;
  onDone: () => void;
}) {
  const steps = [
    { label: "Création du PDF", detail: `recepisse_${folio}.pdf`, at: 350 },
    { label: "Signature horodatée", detail: "empreinte SHA-256", at: 1050 },
    { label: "Chiffrement du document", detail: "archivage sécurisé", at: 1750 },
    { label: "Enregistrement sur le serveur", detail: "RemiseCMR · VPS", at: 2550 },
    { label: "Récépissé disponible", detail: "prêt à imprimer", at: 3350 },
  ];
  const [done, setDone] = React.useState(0);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  React.useEffect(() => {
    const timers = steps.map((s, i) =>
      setTimeout(() => setDone(i + 1), s.at),
    );
    const finish = setTimeout(() => onDoneRef.current(), 4250);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: "rgba(250,248,244,0.82)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "overlayIn 0.35s cubic-bezier(0.2,0.8,0.2,1) both",
        padding: 40,
        gap: 26,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 160,
          height: 160,
          animation: "mascotIn 0.6s cubic-bezier(0.2,0.9,0.3,1.15) both",
        }}
      >
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke={C.line}
            strokeWidth="5"
          />
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="#36C26B"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 68}
            strokeDashoffset={2 * Math.PI * 68 * (1 - done / steps.length)}
            transform="rotate(-90 80 80)"
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 28,
              background: "#fff",
              border: `1px solid ${C.line}`,
              boxShadow: "0 10px 30px rgba(20,24,35,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.primary,
              animation: "docPulse 1.6s ease-in-out infinite",
            }}
          >
            {Icons.doc({ size: 44, stroke: "currentColor", strokeWidth: 1.5 })}
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          animation: "captionIn 0.4s cubic-bezier(0.2,0.8,0.2,1) 0.15s both",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: -0.8,
            lineHeight: 1.05,
            fontFamily: K.display,
          }}
        >
          Enregistrement du récépissé…
        </div>
        <div style={{ fontSize: 14, color: C.ink3, fontWeight: 500 }}>
          Référence{" "}
          <span
            style={{ fontFamily: C.mono, color: C.ink, fontWeight: 700 }}
          >
            {folio}
          </span>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: `1px solid ${C.line}`,
          boxShadow:
            "0 1px 0 rgba(20,24,35,0.02), 0 14px 36px rgba(20,24,35,0.05)",
          padding: "6px 22px",
          minWidth: 460,
          animation: "captionIn 0.4s cubic-bezier(0.2,0.8,0.2,1) 0.25s both",
        }}
      >
        {steps.map((s, i) => {
          const isDone = i < done;
          const isActive = i === done;
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
                opacity: !isDone && !isActive ? 0.4 : 1,
                transition: "opacity 0.3s",
              }}
            >
              {isDone ? (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: C.success,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    animation:
                      "checkPop 0.45s cubic-bezier(0.2,0.9,0.3,1.4) both",
                  }}
                >
                  {Icons.check({ size: 16, stroke: "#fff", strokeWidth: 2.8 })}
                </div>
              ) : isActive ? (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    border: `2.5px solid ${C.primary}`,
                    borderTopColor: "transparent",
                    animation: "spin 0.9s linear infinite",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    border: `2px solid ${C.lineStrong}`,
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.ink3,
                    fontFamily: C.mono,
                    marginTop: 1,
                  }}
                >
                  {s.detail}
                </div>
              </div>
              {isDone && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1F8A47",
                    fontFamily: C.mono,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  OK
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 13,
          color: C.ink3,
          fontWeight: 500,
          fontFamily: C.mono,
          animation: "captionIn 0.4s cubic-bezier(0.2,0.8,0.2,1) 0.4s both",
        }}
      >
        {done}/{steps.length} étapes terminées
      </div>
    </div>
  );
}
