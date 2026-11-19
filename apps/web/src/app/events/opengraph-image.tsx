import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Events · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default function Image() {
  return createOgImage("Events", "Decoded Qubic logs with participants, transactions and ticks.");
}
