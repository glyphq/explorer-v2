"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { CORE_REFRESH_MS, RACE_REFRESH_MS } from "./model";
import { readCoreSnapshot, readRaceSnapshot } from "./upstream";

export function useBpp9000() {
  return useQuery({
    queryFn: ({ signal }) => readCoreSnapshot(signal),
    queryKey: ["bpp9000", "core"],
    refetchInterval: CORE_REFRESH_MS,
    staleTime: CORE_REFRESH_MS / 2,
  });
}

export function useBppRace() {
  return useQuery({
    queryFn: ({ signal }) => readRaceSnapshot(signal),
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
