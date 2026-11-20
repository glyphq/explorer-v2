import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@solar-icons/react", "lucide-react"],
  },
  async headers() {
    return [
      {
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
        source: "/:path*",
      },
    ];
  },
  poweredByHeader: false,
  async redirects() {
    return [
      {
        destination: "/proposals/view?contract=:contract&index=:index",
        permanent: false,
        source: "/proposals/:contract/:index",
      },
    ];
  },
  reactCompiler: true,
  typedRoutes: true,
  allowedDevOrigins: ["192.168.1.134"],
};

export default withPwa(nextConfig);

initOpenNextCloudflareForDev();
