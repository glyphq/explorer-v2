import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Computors",
  "The Qubic computors elected to verify ticks in the current epoch.",
  "epochs",
);

export default function ComputorsLayout({ children }: { children: ReactNode }) {
  return children;
}
