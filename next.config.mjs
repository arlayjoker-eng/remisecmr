/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy taillée pour ce kiosque :
//  - html5-qrcode a besoin de la caméra (Permissions-Policy: camera=self)
//  - la signature au canvas produit des images blob:/data:
//  - Next.js injecte des styles/scripts inline à l'hydratation → 'unsafe-inline'
//  - les polices sont auto-hébergées (next/font) → aucune origine externe
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // React Refresh évalue du code à la volée en développement : sans
  // 'unsafe-eval' le bundle client meurt (EvalError) et l'écran de connexion
  // reste figé. La production garde la directive stricte, sans 'unsafe-eval'.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // HSTS n'est activé qu'en production : sur un poste de test HTTP il
  // verrouillerait l'accès. Nginx (TLS) peut aussi le poser à sa couche.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig = {
  // Build strict côté TypeScript (tsc passe proprement — CN-008). ESLint reste
  // non bloquant au build : les écrans sont des portages fidèles d'un prototype
  // et le lint remonterait surtout du bruit stylistique, pas des erreurs de type.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@prisma/client", "pdf-lib"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
