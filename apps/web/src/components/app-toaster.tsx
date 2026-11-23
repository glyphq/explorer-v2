"use client";

import { Toaster } from "sileo";

export function AppToaster() {
  return (
    <Toaster
      options={{
        fill: "var(--surface)",
        roundness: 8,
      }}
      position="bottom-right"
      theme="dark"
    />
  );
}
