import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

function detailCache(seconds: number, staleSeconds = seconds) {
  return [
    {
      key: "Cache-Control",
      value: `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`,
    },
  ];
}

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
      {
        headers: detailCache(300),
        source: "/accounts/:identity",
      },
      {
        headers: detailCache(300),
        source: "/assets/:issuer/:name",
      },
      {
        headers: detailCache(300),
        source: "/epochs/:epoch",
      },
      {
        headers: detailCache(300),
        source: "/ticks/:tick",
      },
      {
        headers: detailCache(86_400, 3600),
        source: "/transactions/:hash",
      },
      {
        headers: detailCache(300),
        source: "/proposals",
      },
      {
        headers: detailCache(300),
        source: "/proposals/view",
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
