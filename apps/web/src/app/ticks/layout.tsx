import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Ticks",
  "Every tick Glyph fetched from a Qubic peer, with quorum evidence and activity.",
  "ticks",
);

export default function TicksLayout({ children }: { children: ReactNode }) {
  return children;
}
