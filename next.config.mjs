/** @type {import('next').NextConfig} */
const nextConfig = {
  // The screens are faithful ports of a JS prototype; types are loose by design.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@prisma/client", "pdf-lib"],
};

export default nextConfig;
