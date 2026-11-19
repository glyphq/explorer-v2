"use client";

import { Toaster } from "sileo";

export function AppToaster() {
  return (
    <Toaster
      options={{
        fill: "var(--foreground)",
        roundness: 14,
      }}
      position="bottom-right"
      theme="system"
    />
  );
}
