import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

import { withPwa } from "./pwa.config";

const nextConfig: NextConfig = {
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
