import { shorten } from "@/lib/format";
import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Account · Glyph Explorer";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default async function Image({ params }: { params: Promise<{ identity: string }> }) {
  const { identity } = await params;
  return createOgImage(
    `Account ${shorten(identity, 12, 8)}`,
    "Balance, activity and counterparties.",
  );
}
