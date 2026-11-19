import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Transactions",
  "Transfers observed inside verified Qubic ticks.",
);

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  return children;
}
