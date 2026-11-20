import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Exchanges",
  "Active Qubic exchange accounts and their on-chain identities.",
  "exchanges",
);

export default function ExchangesLayout({ children }: { children: ReactNode }) {
  return children;
}
