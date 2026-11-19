import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Epochs",
  "Qubic epoch summaries with tick ranges and elected computors.",
  "epochs",
);

export default function EpochsLayout({ children }: { children: ReactNode }) {
  return children;
}
