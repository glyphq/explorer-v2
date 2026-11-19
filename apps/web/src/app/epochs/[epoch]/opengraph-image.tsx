import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Epoch · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default async function Image({ params }: { params: Promise<{ epoch: string }> }) {
  const { epoch } = await params;
  return createOgImage(`Epoch ${epoch}`, "Computor set and activity.");
}
