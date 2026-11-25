import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

// HTML references build-specific JS and CSS chunks. Keep it out of the browser
// cache and only at the edge briefly so a deploy cannot leave visitors on a
// document whose assets no longer exist.
function htmlCache(seconds = 60) {
  return [
    {
      key: "Cache-Control",
      value: `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds}`,
    },
  ];
}

const htmlRoutes = [
  "/",
  "/accounts",
  "/accounts/:identity",
  "/addresses",
  "/assets",
  "/assets/:issuer/:name",
  "/computors",
  "/contracts",
  "/contracts/:contract",
  "/epochs",
  "/epochs/:epoch",
  "/events",
  "/exchanges",
  "/proposals",
  "/proposals/view",
  "/ticks",
  "/ticks/:tick",
  "/transactions",
  "/transactions/:hash",
];

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
      ...htmlRoutes.map((source) => ({ headers: htmlCache(), source })),
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
