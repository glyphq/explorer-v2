import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Tick · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default async function Image({ params }: { params: Promise<{ tick: string }> }) {
  const { tick } = await params;
  const value = Number(tick);
  return createOgImage(
    Number.isFinite(value) ? `Tick ${value.toLocaleString("en-US")}` : "Tick",
    "Header, quorum evidence, transactions and events.",
  );
}
