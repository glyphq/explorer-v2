"use client";

import { type ReactNode, useEffect, useState } from "react";

import { usePageLoading } from "./page-reveal";

/**
 * Render a lightweight fallback during the server pass and hydrate the
 * interactive detail view on the client. Explorer detail routes fetch their
 * data client-side, so server-rendering the full view only burns Worker CPU.
 */
export function ClientOnly({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  usePageLoading(!mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : fallback;
}
