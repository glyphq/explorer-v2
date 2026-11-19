"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { REFRESH_MS } from "./model";
import type { BppSnapshot } from "./types";

export function useBpp9000() {
  return useQuery({
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/bpp9000", { signal });
      if (!response.ok) {
        let message = "BPP-9000 data is not answering right now.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          // Keep the fallback message when the response is not JSON.
        }
        throw new Error(message);
      }
      return (await response.json()) as BppSnapshot;
    },
    queryKey: ["bpp9000", "snapshot"],
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS / 2,
  });
}

export function useNowSeconds(intervalMs = 15_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000));
    update();
    const timer = window.setInterval(update, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
