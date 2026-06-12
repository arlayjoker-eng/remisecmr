"use client";
// KIDO-flavored UI primitives — playful, chunky, purple-first.
// Faithful port of the design handoff `ui-kido.jsx`.
import React from "react";
import { K, C } from "@/lib/k";

export { K, C };

// ─── Icons (chunky — stroke 2.25, rounded) ─────────────────
type IconProps = {
  d?: string;
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
};

const Icon = ({
  d,
  size = 22,
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 2.25,
  children,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

export const Icons = {
  scan: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M3 12h18" />
    </Icon>
  ),
  search: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  ),
  check: (p: IconProps) => (
    <Icon {...p}>
      <path d="m5 12 5 5L20 6" />
    </Icon>
  ),
  x: (p: IconProps) => (
    <Icon {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  ),
  back: (p: IconProps) => (
    <Icon {...p}>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  ),
  chev: (p: IconProps) => (
    <Icon {...p}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  ),
  pen: (p: IconProps) => (
    <Icon {...p}>
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </Icon>
  ),
  device: (p: IconProps) => (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M2 20h20" />
    </Icon>
  ),
  box: (p: IconProps) => (
    <Icon {...p}>
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </Icon>
  ),
  user: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  ),
  group: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20a7 7 0 0 1 14 0" />
      <circle cx="17" cy="6" r="2.5" />
      <path d="M22 18a5 5 0 0 0-6-4.9" />
    </Icon>
  ),
  phone: (p: IconProps) => (
    <Icon {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </Icon>
  ),
  hash: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
    </Icon>
  ),
  doc: (p: IconProps) => (
    <Icon {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </Icon>
  ),
  clock: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  flash: (p: IconProps) => (
    <Icon {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" />
    </Icon>
  ),
  refresh: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </Icon>
  ),
  play: (p: IconProps) => (
    <Icon {...p} fill="currentColor" strokeWidth={0}>
      <path d="M8 5v14l11-7L8 5z" />
    </Icon>
  ),
  star: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 2.5l2.7 6.6 7 .6-5.3 4.7 1.6 6.9L12 17.8l-6 3.5 1.6-6.9L2.3 9.7l7-.6z" />
    </Icon>
  ),
  sparkle: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 3v6m0 6v6M3 12h6m6 0h6M5.6 5.6l4.2 4.2m4.4 4.4 4.2 4.2M18.4 5.6l-4.2 4.2m-4.4 4.4-4.2 4.2" />
    </Icon>
  ),
  download: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
    </Icon>
  ),
  list: (p: IconProps) => (
    <Icon {...p}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  ),
  shield: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
};

// ─── Chunky pill button ────────────────────────────────────
type BtnProps = {
  children?: React.ReactNode;
  kind?:
    | "primary"
    | "success"
    | "cta"
    | "warm"
    | "ghost"
    | "ghostDark"
    | "danger"
    | "soft"
    | "light";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
};

export function Btn({
  children,
  kind = "primary",
  size = "md",
  onClick,
  icon,
  disabled,
  full,
  style = {},
}: BtnProps) {
  const heights: Record<string, number> = { md: 56, lg: 68, sm: 42 };
  const fs: Record<string, number> = { md: 16, lg: 19, sm: 14 };
  const padX: Record<string, number> = { md: 26, lg: 32, sm: 18 };
  const palettes: Record<string, any> = {
    primary: {
      bg: K.violetDeep,
      fg: "#fff",
      shadow: "0 6px 0 #1B0F45, 0 14px 28px rgba(58,27,140,0.45)",
    },
    success: {
      bg: K.green,
      fg: "#fff",
      shadow: "0 6px 0 #1F8A47, 0 14px 28px rgba(54,194,107,0.40)",
    },
    cta: {
      bg: K.pink,
      fg: "#fff",
      shadow: "0 6px 0 #C5286A, 0 14px 28px rgba(255,61,139,0.40)",
    },
    warm: {
      bg: K.orange,
      fg: "#fff",
      shadow: "0 6px 0 #C66526, 0 14px 28px rgba(255,140,66,0.40)",
    },
    ghost: {
      bg: "transparent",
      fg: K.ink2,
      shadow: "0 2px 0 rgba(27,15,69,0.08)",
      border: `2px solid ${K.lineStrong}`,
    },
    ghostDark: {
      // Recoloré pour le thème clair premium — navy lisible partout.
      bg: "#1E3A5F",
      fg: "#fff",
      shadow: "0 4px 0 #0F2540, 0 10px 22px rgba(30,58,95,0.30)",
      border: "none",
    },
    danger: {
      bg: "#fff",
      fg: K.red,
      shadow: "0 2px 0 rgba(27,15,69,0.08)",
      border: `2px solid ${K.pinkSoft}`,
    },
    soft: {
      bg: K.violetSoft,
      fg: K.violetDeep,
      shadow: "0 4px 0 rgba(75,31,176,0.18)",
    },
    light: {
      bg: "#fff",
      fg: K.ink,
      shadow: "0 4px 0 rgba(27,15,69,0.10), 0 10px 24px rgba(27,15,69,0.12)",
    },
  };
  const p = palettes[kind];
  const [pressed, setPressed] = React.useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        height: heights[size],
        minWidth: heights[size],
        padding: `0 ${padX[size]}px`,
        borderRadius: 999,
        background: disabled ? "#E2DCEF" : p.bg,
        color: disabled ? "#B6ABD4" : p.fg,
        border: p.border || "none",
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: fs[size],
        letterSpacing: -0.2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : undefined,
        boxShadow: disabled
          ? "none"
          : pressed
            ? "inset 0 4px 12px rgba(0,0,0,0.18)"
            : p.shadow,
        transform: pressed ? "translateY(4px)" : "translateY(0)",
        transition:
          "transform 0.12s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.12s",
        outline: "none",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Bubbly pill/tag ───────────────────────────────────────
type PillProps = {
  children?: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warn" | "danger" | "live" | "onDark";
  icon?: React.ReactNode;
  size?: "md" | "lg";
};

export function Pill({ children, tone = "neutral", icon, size = "md" }: PillProps) {
  const tones: Record<string, any> = {
    neutral: { bg: "#F2EEFF", fg: K.ink2 },
    primary: { bg: K.violetSoft, fg: K.violetDeep },
    success: { bg: K.greenSoft, fg: "#1F8A47" },
    warn: { bg: K.yellowSoft, fg: "#8A6A14" },
    danger: { bg: K.pinkSoft, fg: "#B2245A" },
    live: { bg: K.pink, fg: "#fff" },
    onDark: { bg: "#1E3A5F", fg: "#fff" },
  };
  const t = tones[tone];
  const s =
    size === "lg"
      ? { h: 32, fs: 12, px: 14 }
      : { h: 26, fs: 11, px: 11 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: s.fs,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

// ─── KV row ────────────────────────────────────────────────
export function KV({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderTop: `1px solid ${K.line}`,
      }}
    >
      <div style={{ flexShrink: 0, color: K.violet }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: K.ink3,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 17,
            color: K.ink,
            fontWeight: 700,
            fontFamily: mono ? K.mono : K.display,
            letterSpacing: mono ? 0 : -0.2,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Friendly initials avatar ──────────────────────────────
export function Avatar({ student, size = 64 }: { student: any; size?: number }) {
  const first = student.firstName ?? student.first ?? "";
  const last = student.lastName ?? student.last ?? "";
  const initials = ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
  const hue = student.color ?? 264;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `oklch(0.92 0.10 ${hue})`,
        color: `oklch(0.34 0.16 ${hue})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: K.display,
        fontSize: size * 0.4,
        fontWeight: 800,
        letterSpacing: -0.5,
        flexShrink: 0,
        border: `3px solid oklch(0.85 0.13 ${hue})`,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Mascot: friendly laptop with face ─────────────────────
export function LaptopMascot({ size = 220 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.85}
      viewBox="0 0 220 188"
      style={{ display: "block" }}
    >
      <ellipse cx="110" cy="174" rx="80" ry="8" fill="rgba(0,0,0,0.18)" />
      <rect x="14" y="148" width="192" height="20" rx="6" fill="#2D0F75" />
      <rect x="14" y="148" width="192" height="10" rx="5" fill="#4B1FB0" />
      <rect
        x="28"
        y="22"
        width="164"
        height="128"
        rx="14"
        fill="#FFFFFF"
        stroke="#2D0F75"
        strokeWidth="4"
      />
      <rect x="38" y="32" width="144" height="108" rx="8" fill="#5B2BC9" />
      <ellipse cx="86" cy="80" rx="13" ry="16" fill="#FFFFFF" />
      <ellipse cx="134" cy="80" rx="13" ry="16" fill="#FFFFFF" />
      <circle cx="89" cy="84" r="6" fill="#1B0F45" />
      <circle cx="137" cy="84" r="6" fill="#1B0F45" />
      <circle cx="91" cy="82" r="2" fill="#FFFFFF" />
      <circle cx="139" cy="82" r="2" fill="#FFFFFF" />
      <path
        d="M86 108 Q110 124 134 108"
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="68" cy="104" r="6" fill="#FF8FB3" opacity="0.7" />
      <circle cx="152" cy="104" r="6" fill="#FF8FB3" opacity="0.7" />
      <g stroke="#FFD23F" strokeWidth="3" strokeLinecap="round">
        <path d="M10 40 L18 40 M14 36 L14 44" />
        <path d="M198 60 L206 60 M202 56 L202 64" />
        <path d="M6 100 L14 100 M10 96 L10 104" />
      </g>
      <g fill="#FF3D8B">
        <circle cx="200" cy="20" r="4" />
        <circle cx="16" cy="14" r="3" />
      </g>
    </svg>
  );
}

// ─── Mascot: friendly padlock with face ────────────────────
export function PadlockMascot({ size = 220 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.95}
      viewBox="0 0 220 210"
      style={{ display: "block" }}
    >
      <ellipse cx="110" cy="196" rx="68" ry="7" fill="rgba(0,0,0,0.18)" />
      <path
        d="M64 100 Q64 38 110 38 Q156 38 156 100 L156 130"
        stroke="#A8A39A"
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M64 100 Q64 38 110 38 Q156 38 156 100 L156 130"
        stroke="#D6D2C9"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="38"
        y="92"
        width="144"
        height="104"
        rx="20"
        fill="#36C26B"
        stroke="#1F8A47"
        strokeWidth="5"
      />
      <rect x="46" y="100" width="128" height="14" rx="7" fill="#6AE3A8" opacity="0.55" />
      <circle cx="110" cy="180" r="8" fill="#1F8A47" />
      <rect x="106" y="178" width="8" height="14" rx="2" fill="#1F8A47" />
      <ellipse cx="86" cy="138" rx="13" ry="16" fill="#FFFFFF" />
      <ellipse cx="134" cy="138" rx="13" ry="16" fill="#FFFFFF" />
      <circle cx="89" cy="142" r="6" fill="#0F3D22" />
      <circle cx="137" cy="142" r="6" fill="#0F3D22" />
      <circle cx="91" cy="140" r="2" fill="#FFFFFF" />
      <circle cx="139" cy="140" r="2" fill="#FFFFFF" />
      <path
        d="M90 162 Q110 174 130 162"
        stroke="#0F3D22"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="64" cy="160" r="6" fill="#FF8FB3" opacity="0.65" />
      <circle cx="156" cy="160" r="6" fill="#FF8FB3" opacity="0.65" />
      <g stroke="#FFD23F" strokeWidth="3" strokeLinecap="round">
        <path d="M14 60 L22 60 M18 56 L18 64" />
        <path d="M198 84 L206 84 M202 80 L202 88" />
        <path d="M8 130 L16 130 M12 126 L12 134" />
      </g>
      <g fill="#FF3D8B">
        <circle cx="202" cy="36" r="4" />
        <circle cx="20" cy="20" r="3" />
      </g>
    </svg>
  );
}

// ─── Tile icon — colorful gradient square ──────────────────
export function TileIcon({ kind, size = 44 }: { kind: string; size?: number }) {
  const variants: Record<string, any> = {
    badge: {
      grad: ["#6BA8F5", "#2F66C2"],
      shadow: "rgba(47,102,194,0.40)",
      svg: (
        <g fill="#fff">
          <circle cx="22" cy="17" r="6" />
          <path d="M10 36 Q10 26 22 26 Q34 26 34 36 L34 40 L10 40 Z" />
          <circle cx="33" cy="11" r="5.5" fill="#FFD23F" stroke="#fff" strokeWidth="2" />
          <path
            d="M30 11 L32 13 L36 9"
            stroke="#1B0F45"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ),
    },
    backpack: {
      grad: ["#FFB266", "#FF7A2E"],
      shadow: "rgba(255,122,46,0.40)",
      svg: (
        <g>
          <path
            d="M16 11 Q16 6 22 6 Q28 6 28 11"
            stroke="#fff"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M10 16 Q10 11 16 11 L28 11 Q34 11 34 16 L34 36 Q34 39 31 39 L13 39 Q10 39 10 36 Z"
            fill="#fff"
          />
          <rect x="14" y="21" width="16" height="11" rx="2" fill="#FF9A45" />
          <rect x="14" y="21" width="16" height="2" fill="#E66E1F" opacity="0.4" />
          <circle cx="22" cy="26.5" r="2" fill="#fff" />
        </g>
      ),
    },
    box: {
      grad: ["#B589F0", "#6E3FCB"],
      shadow: "rgba(110,63,203,0.40)",
      svg: (
        <g>
          <path d="M22 5 L36 12 L36 30 L22 37 L8 30 L8 12 Z" fill="#fff" />
          <path d="M22 5 L36 12 L22 19 L8 12 Z" fill="#E6D7FF" />
          <path d="M22 19 L22 37" stroke="#C0A5F0" strokeWidth="1.5" />
          <path
            d="M14 9 L29 16 L29 23"
            stroke="#E6D7FF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ),
    },
    family: {
      grad: ["#FF8FB3", "#E84C84"],
      shadow: "rgba(232,76,132,0.40)",
      svg: (
        <g fill="#fff">
          <circle cx="16" cy="14" r="5" />
          <circle cx="29" cy="16" r="4" />
          <path d="M6 38 Q6 23 16 23 Q26 23 26 38 Z" />
          <path d="M22 38 Q22 27 29 27 Q36 27 36 38 Z" />
          <circle cx="16" cy="13" r="1.3" fill="#E84C84" />
          <path
            d="M14 16 Q16 17.5 18 16"
            stroke="#E84C84"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ),
    },
    phone: {
      grad: ["#6AE3A8", "#2BB070"],
      shadow: "rgba(43,176,112,0.40)",
      svg: (
        <g>
          <rect x="13" y="6" width="18" height="32" rx="4" fill="#fff" />
          <rect x="15" y="11" width="14" height="20" rx="1" fill="#2BB070" />
          <circle cx="22" cy="35" r="1.6" fill="#2BB070" />
          <rect x="19" y="8" width="6" height="1.5" rx="0.75" fill="#2BB070" />
          <path
            d="M17 16 L21 20 L27 13"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ),
    },
    laptop: {
      grad: ["#FFD56B", "#FF9A2E"],
      shadow: "rgba(255,154,46,0.40)",
      svg: (
        <g>
          <rect x="9" y="11" width="26" height="18" rx="2.5" fill="#fff" />
          <rect x="11" y="13" width="22" height="14" rx="1" fill="#FFA73F" />
          <path
            d="M5 30 L39 30 Q40 30 39.5 31 L36 35 Q35.5 36 34 36 L10 36 Q8.5 36 8 35 L4.5 31 Q4 30 5 30 Z"
            fill="#fff"
          />
          <path d="M19 33 L25 33" stroke="#FFA73F" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="14" y="16" width="3" height="3" rx="0.5" fill="#fff" />
          <rect x="14" y="20" width="10" height="1" fill="#fff" opacity="0.7" />
          <rect x="14" y="23" width="7" height="1" fill="#fff" opacity="0.7" />
        </g>
      ),
    },
    locker: {
      grad: ["#4ED5D5", "#1AA0A0"],
      shadow: "rgba(26,160,160,0.40)",
      svg: (
        <g>
          <rect x="9" y="5" width="26" height="34" rx="3" fill="#fff" />
          <rect x="11" y="7" width="22" height="30" rx="2" fill="#22B5B5" />
          <rect x="13" y="9" width="18" height="3" rx="1" fill="#fff" opacity="0.7" />
          <circle cx="29" cy="23" r="2" fill="#fff" />
          <rect x="14" y="29" width="6" height="1.5" fill="#fff" opacity="0.5" />
        </g>
      ),
    },
    sparkle: {
      grad: ["#FFD23F", "#FF8C42"],
      shadow: "rgba(255,140,66,0.40)",
      svg: (
        <g fill="#fff">
          <path d="M22 4 L24.5 16 L36 18 L24.5 20 L22 32 L19.5 20 L8 18 L19.5 16 Z" />
          <circle cx="34" cy="34" r="3" />
          <circle cx="10" cy="34" r="2" />
        </g>
      ),
    },
  };
  const t = variants[kind];
  if (!t) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: `linear-gradient(135deg, ${t.grad[0]} 0%, ${t.grad[1]} 100%)`,
        boxShadow: `0 4px 0 ${t.shadow}, 0 8px 16px rgba(27,15,69,0.10)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 44 44">
        {t.svg}
      </svg>
    </div>
  );
}

// ─── Spinner — shared across screens ───────────────────────
export function Spinner() {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        border: "2.5px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff",
        animation: "spin 0.9s linear infinite",
      }}
    />
  );
}
