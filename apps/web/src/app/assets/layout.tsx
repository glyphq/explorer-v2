import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Assets",
  "Assets issued on Qubic and discovered by the Glyph index.",
  "assets",
);

export default function AssetsLayout({ children }: { children: ReactNode }) {
  return children;
}
