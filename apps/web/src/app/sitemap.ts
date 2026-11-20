import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const routes = [
  { changeFrequency: "hourly", path: "/", priority: 1 },
  { changeFrequency: "hourly", path: "/ticks", priority: 0.9 },
  { changeFrequency: "hourly", path: "/transactions", priority: 0.9 },
  { changeFrequency: "hourly", path: "/events", priority: 0.8 },
  { changeFrequency: "daily", path: "/epochs", priority: 0.8 },
  { changeFrequency: "daily", path: "/accounts", priority: 0.8 },
  { changeFrequency: "daily", path: "/assets", priority: 0.7 },
  { changeFrequency: "daily", path: "/exchanges", priority: 0.7 },
  { changeFrequency: "weekly", path: "/contracts", priority: 0.7 },
  { changeFrequency: "daily", path: "/proposals", priority: 0.7 },
  { changeFrequency: "daily", path: "/bpp9000", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    url: `${SITE_URL}${route.path}`,
  }));
}
