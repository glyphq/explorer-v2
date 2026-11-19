import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Ticks · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default function Image() {
  return createOgImage(
    "Ticks",
    "Every tick Glyph fetched from a Qubic peer, with quorum evidence and activity.",
  );
}
