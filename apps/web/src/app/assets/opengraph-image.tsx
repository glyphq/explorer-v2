import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Assets · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default function Image() {
  return createOgImage("Assets", "Assets issued on Qubic and discovered by the Glyph index.");
}
