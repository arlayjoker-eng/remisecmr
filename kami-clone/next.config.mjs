import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias.canvas = false; // pdf.js lo importa solo en Node
    config.resolve.alias["@"] = path.join(here, "src");
    return config;
  },
};
export default nextConfig;
