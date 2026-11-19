import { createOgImage, OG_ALT_SUFFIX, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = OG_ALT_SUFFIX;
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

export default function Image() {
  return createOgImage(
    OG_ALT_SUFFIX,
    "Qubic ticks, transactions, epochs, accounts, events and assets.",
  );
}
