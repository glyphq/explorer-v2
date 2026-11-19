"use client";

import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";

import type { Tick, Transaction } from "./generated/types.gen";
import { GLYPH_API_URL } from "./hey-api";

type StreamTick = Tick & { tick: number };
type StreamTransaction = Transaction & { hash: string };

type LiveStreamState = {
  connected: boolean;
  ticks: StreamTick[];
  transactions: StreamTransaction[];
};

const LiveStreamContext = createContext<LiveStreamState>({
  connected: false,
  ticks: [],
  transactions: [],
});

export function LiveStreamProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState<StreamTick[]>([]);
  const [transactions, setTransactions] = useState<StreamTransaction[]>([]);

  useEffect(() => {
    const source = new EventSource(`${GLYPH_API_URL}/v1/stream?types=tick,transaction`);

    source.addEventListener("open", () => setConnected(true));
    source.addEventListener("error", () => setConnected(false));
    source.addEventListener("tick", (event) => {
      try {
        const message = event as MessageEvent<string>;
        const tick = JSON.parse(message.data) as Tick;
        if (typeof tick.tick !== "number") {
          return;
        }
        const nextTick = { ...tick, tick: tick.tick };
        startTransition(() => {
          setTicks((previous) => {
            if (previous[0]?.tick === nextTick.tick) {
              return previous;
            }
            const next = previous.filter((item) => item.tick !== nextTick.tick);
            return [nextTick, ...next].slice(0, 100);
          });
        });
      } catch {
        // Ignore malformed frames and keep the stream open.
      }
    });

    source.addEventListener("transaction", (event) => {
      try {
        const message = event as MessageEvent<string>;
        const transaction = JSON.parse(message.data) as Transaction;
        if (typeof transaction.hash !== "string") {
          return;
        }
        const nextTransaction = { ...transaction, hash: transaction.hash };
        startTransition(() => {
          setTransactions((previous) => {
            if (previous[0]?.hash === nextTransaction.hash) {
              return previous;
            }
            const next = previous.filter((item) => item.hash !== nextTransaction.hash);
            return [nextTransaction, ...next].slice(0, 12);
          });
        });
      } catch {
        // Ignore malformed frames and keep the stream open.
      }
    });

    return () => source.close();
  }, []);

  const value = useMemo(
    () => ({ connected, ticks, transactions }),
    [connected, ticks, transactions],
  );

  return <LiveStreamContext.Provider value={value}>{children}</LiveStreamContext.Provider>;
}

export function useLiveStream() {
  return useContext(LiveStreamContext);
}
