"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { CORE_REFRESH_MS, RACE_REFRESH_MS } from "./model";
import type { BppRaceSnapshot, BppSnapshot } from "./types";

async function readSnapshot<T>(part: "core" | "race", signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/bpp9000?part=${part}`, { signal });
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
  return (await response.json()) as T;
}

export function useBpp9000() {
  return useQuery({
    queryFn: ({ signal }) => readSnapshot<BppSnapshot>("core", signal),
    queryKey: ["bpp9000", "core"],
    refetchInterval: CORE_REFRESH_MS,
    staleTime: CORE_REFRESH_MS / 2,
  });
}

export function useBppRace() {
  return useQuery({
    queryFn: ({ signal }) => readSnapshot<BppRaceSnapshot>("race", signal),
    queryKey: ["bpp9000", "race"],
    refetchInterval: RACE_REFRESH_MS,
    staleTime: RACE_REFRESH_MS / 2,
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
