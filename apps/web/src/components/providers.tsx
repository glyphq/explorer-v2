"use client";

import { MotionConfig } from "motion/react";

import { AppToaster } from "./app-toaster";
import { QueryProvider } from "./query-provider";
import { RouteTransitionProvider } from "./route-transition";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      forcedTheme="dark"
    >
      <MotionConfig reducedMotion="user">
        <RouteTransitionProvider>
          <QueryProvider>
            {children}
            <AppToaster />
          </QueryProvider>
        </RouteTransitionProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
