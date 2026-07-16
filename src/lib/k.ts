// KIDO design tokens — shared by every screen. Pure data (no "use client").
export const K = {
  // Backgrounds
  // bgApp — fond premium clair et chaleureux, partagé par tous les écrans.
  bgApp: "linear-gradient(180deg, #FBFAF7 0%, #F6F3EC 60%, #F1ECE2 100%)",
  bg: "linear-gradient(180deg, #6B3FE0 0%, #4B1FB0 55%, #2D0F75 100%)",
  bgSolid: "#4B1FB0",
  // Ombres douces unifiées (cartes sur fond clair)
  shadowCard: "0 1px 2px rgba(27,15,69,0.05), 0 12px 32px rgba(27,15,69,0.10)",
  shadowCardLg: "0 2px 4px rgba(27,15,69,0.06), 0 24px 56px rgba(27,15,69,0.14)",
  surface: "#FFFFFF",
  surfaceWarm: "#FFF8EE",
  surfaceCool: "#F2EEFF",
  // Inks
  ink: "#1B0F45",
  ink2: "#3D2A78",
  ink3: "#7766A8",
  ink4: "#B6ABD4",
  line: "rgba(27,15,69,0.08)",
  lineStrong: "rgba(27,15,69,0.16)",
  // Brand palette
  violet: "#5B2BC9",
  violetDeep: "#3A1B8C",
  pink: "#FF3D8B",
  orange: "#FF8C42",
  yellow: "#FFC93C",
  teal: "#2AD4D4",
  green: "#36C26B",
  red: "#FF4D5E",
  // Soft tints
  violetSoft: "#EFE7FF",
  pinkSoft: "#FFE3EE",
  orangeSoft: "#FFE9D9",
  yellowSoft: "#FFF4D0",
  tealSoft: "#D7F7F7",
  greenSoft: "#DCF5E5",
  // Fonts — variables auto-hébergées (next/font), avec repli système.
  display:
    'var(--font-jakarta), "Plus Jakarta Sans", "Sora", system-ui, sans-serif',
  body: 'var(--font-jakarta), "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  mono: 'var(--font-mono), "JetBrains Mono", ui-monospace, Menlo, monospace',
  // Compatibility aliases used by some legacy screens
  primary: "#5B2BC9",
  primarySoft: "#EFE7FF",
  primaryInk: "#3A1B8C",
  success: "#36C26B",
  successSoft: "#DCF5E5",
  warn: "#FFC93C",
  warnSoft: "#FFF4D0",
  danger: "#FF4D5E",
  dangerSoft: "#FFE3EE",
};

// Legacy alias — several screens reference `C`.
export const C = K;
