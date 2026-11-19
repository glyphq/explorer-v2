import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Accounts",
  "Qubic accounts ranked by their latest indexed activity.",
);

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return children;
}
