"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sileo";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" || resolvedTheme === "dark" ? resolvedTheme : "system";

  return (
    <Toaster
      options={{
        fill: "var(--surface)",
        roundness: 14,
      }}
      position="bottom-right"
      theme={theme}
    />
  );
}
