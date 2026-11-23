"use client";

import { MotionConfig } from "motion/react";

import { AppToaster } from "./app-toaster";
import { QueryProvider } from "./query-provider";
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
        <QueryProvider>
          {children}
          <AppToaster />
        </QueryProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
