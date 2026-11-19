import { shorten } from "@/lib/format";
import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Transaction · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default async function Image({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return createOgImage(
    `Transaction ${shorten(hash, 14, 10)}`,
    "Effects, participants and attached events.",
  );
}
