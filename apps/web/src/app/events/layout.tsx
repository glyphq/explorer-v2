import type { ReactNode } from "react";

import { sectionMetadata } from "@/lib/metadata";

export const metadata = sectionMetadata(
  "Events",
  "Decoded Qubic logs with participants, transactions and ticks.",
);

export default function EventsLayout({ children }: { children: ReactNode }) {
  return children;
}
