import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: root,
  transpilePackages: ["@hr/shared", "@hr/i18n", "pdfjs-dist"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
