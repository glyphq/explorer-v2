import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Known addresses",
  "Verified wallets, active exchange accounts, and official Glyph addresses.",
  "addresses",
);

export default function KnownAddressesLayout({ children }: { children: ReactNode }) {
  return children;
}
