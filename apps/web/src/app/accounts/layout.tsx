import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Identities",
  "Qubic identities ranked by their latest indexed activity.",
  "identities",
);

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return children;
}
