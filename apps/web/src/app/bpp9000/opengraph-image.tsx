import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "BPP-9000 · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default function Image() {
  return createOgImage(
    "BPP-9000",
    "The network's hourly Bitcoin call, computor alignment and recent results.",
  );
}
