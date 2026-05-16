"use client";
// Success overlay — mascot character giving thumbs up.
// Port of `success-cheer-kido.jsx`.
import React from "react";
import { K, Btn, Icons } from "@/components/ui";

const C = K;

export default function SuccessCheer({
  tutorName,
  folio,
  onContinue,
  onDownload,
}: {
  tutorName: string;
  folio: string;
  onContinue: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: "rgba(250,248,244,0.82)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "overlayIn 0.45s cubic-bezier(0.2,0.8,0.2,1) both",
        padding: 40,
        gap: 28,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 320,
          height: 320,
          animation: "mascotIn 0.9s cubic-bezier(0.2,0.9,0.3,1.15) both",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.92 0.08 150 / 0.85), oklch(0.94 0.04 150 / 0.4) 55%, transparent 75%)",
            animation: "haloPulse 2.4s ease-in-out infinite",
          }}
        />
        <Sparkle x={28} y={50} delay={0.3} />
        <Sparkle x={262} y={36} delay={0.55} small />
        <Sparkle x={285} y={150} delay={0.45} />
        <Sparkle x={12} y={170} delay={0.7} small />
        <Sparkle x={50} y={250} delay={0.6} />
        <Sparkle x={250} y={262} delay={0.8} small />

        <svg
          viewBox="0 0 320 320"
          width="320"
          height="320"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <radialGradient id="faceGrad" cx="0.4" cy="0.35" r="0.85">
              <stop offset="0%" stopColor="#FFE4C7" />
              <stop offset="60%" stopColor="#F5C99B" />
              <stop offset="100%" stopColor="#E8B07A" />
            </radialGradient>
            <radialGradient id="handGrad" cx="0.4" cy="0.35" r="0.85">
              <stop offset="0%" stopColor="#FFE4C7" />
              <stop offset="100%" stopColor="#E8B07A" />
            </radialGradient>
            <linearGradient id="shirtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.14 264)" />
              <stop offset="100%" stopColor="oklch(0.42 0.12 264)" />
            </linearGradient>
          </defs>
          <path
            d="M 90 290 Q 90 220 130 200 L 190 200 Q 230 220 230 290 Z"
            fill="url(#shirtGrad)"
          />
          <ellipse
            cx="160"
            cy="200"
            rx="32"
            ry="10"
            fill="oklch(0.32 0.10 264)"
            opacity="0.25"
          />
          <circle cx="160" cy="130" r="70" fill="url(#faceGrad)" />
          <circle cx="118" cy="148" r="11" fill="oklch(0.75 0.15 24 / 0.45)" />
          <circle cx="202" cy="148" r="11" fill="oklch(0.75 0.15 24 / 0.45)" />
          <g style={{ animation: "eyeBlink 4s ease-in-out infinite" }}>
            <path
              d="M 130 122 Q 138 113 148 122"
              stroke="#2A1F12"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 172 122 Q 180 113 190 122"
              stroke="#2A1F12"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <path
            d="M 140 155 Q 160 175 180 155"
            stroke="#2A1F12"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <g
            style={{
              transformOrigin: "215px 200px",
              animation: "thumbWiggle 1.6s ease-in-out infinite",
            }}
          >
            <path
              d="M 215 205 Q 245 165 260 110"
              stroke="url(#shirtGrad)"
              strokeWidth="34"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="263" cy="95" r="26" fill="url(#handGrad)" />
            <path
              d="M 255 78 Q 252 56 264 50 Q 276 52 273 74 Z"
              fill="url(#handGrad)"
              stroke="oklch(0.55 0.10 50 / 0.25)"
              strokeWidth="1"
            />
            <path
              d="M 250 95 Q 260 100 275 95"
              stroke="oklch(0.50 0.10 50 / 0.35)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 250 102 Q 260 107 275 102"
              stroke="oklch(0.50 0.10 50 / 0.35)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          <g
            style={{
              transformOrigin: "105px 100px",
              animation: "badgePop 0.6s cubic-bezier(0.2,0.9,0.3,1.4) 0.5s both",
            }}
          >
            <circle cx="105" cy="100" r="22" fill="oklch(0.62 0.13 150)" />
            <circle
              cx="105"
              cy="100"
              r="22"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              opacity="0.6"
            />
            <path
              d="M 94 100 l 7 7 l 14 -14"
              stroke="#fff"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          animation: "captionIn 0.5s cubic-bezier(0.2,0.8,0.2,1) 0.35s both",
        }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: -1.2,
            lineHeight: 1.05,
            fontFamily: K.display,
          }}
        >
          Tout est OK&nbsp;!
        </div>
        <div
          style={{
            fontSize: 17,
            color: C.ink3,
            fontWeight: 500,
            letterSpacing: -0.2,
            maxWidth: 460,
          }}
        >
          Récépissé signé par{" "}
          <strong style={{ color: C.ink, fontWeight: 700 }}>{tutorName}</strong>{" "}
          et archivé sur le serveur sous la référence{" "}
          <span style={{ fontFamily: C.mono, fontWeight: 700, color: C.ink }}>
            {folio}
          </span>
          .
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          borderRadius: 18,
          background: "#fff",
          border: `1px solid ${C.line}`,
          boxShadow:
            "0 1px 0 rgba(20,24,35,0.02), 0 14px 36px rgba(20,24,35,0.06)",
          animation: "captionIn 0.5s cubic-bezier(0.2,0.8,0.2,1) 0.5s both",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "oklch(0.96 0.04 150)",
            color: "oklch(0.42 0.12 150)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icons.doc({ size: 20, stroke: "currentColor" })}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.ink,
              letterSpacing: -0.2,
            }}
          >
            recepisse_{folio}.pdf
          </div>
          <div
            style={{ fontSize: 12, color: C.ink3, fontFamily: C.mono }}
          >
            Archivé sur le serveur RemiseCMR
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          animation: "captionIn 0.5s cubic-bezier(0.2,0.8,0.2,1) 0.65s both",
        }}
      >
        <Btn
          kind="ghost"
          size="md"
          icon={Icons.download({ size: 18 })}
          onClick={onDownload}
        >
          Télécharger
        </Btn>
        <Btn
          kind="success"
          size="lg"
          icon={Icons.scan({ size: 22, stroke: "#fff" })}
          onClick={onContinue}
        >
          Continuer
        </Btn>
      </div>
    </div>
  );
}

function Sparkle({
  x,
  y,
  delay = 0,
  small,
}: {
  x: number;
  y: number;
  delay?: number;
  small?: boolean;
}) {
  const size = small ? 14 : 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x,
        top: y,
        animation: `sparkle 1.6s ease-in-out ${delay}s infinite`,
        opacity: 0,
      }}
    >
      <path
        d="M12 0 L13.8 9 L23 12 L13.8 14.5 L12 24 L10.2 14.5 L1 12 L10.2 9 Z"
        fill="oklch(0.78 0.16 95)"
      />
    </svg>
  );
}
