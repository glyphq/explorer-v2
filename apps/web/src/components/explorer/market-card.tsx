"use client";

import { motion } from "motion/react";

import { AnimatedNumber } from "@/components/explorer/animated-number";
import type { MarketSnapshot, PricePoint } from "@/lib/api/generated/types.gen";
import { classNames, formatPercent } from "@/lib/format";

import { Skeleton } from "./skeleton";

const chartWidth = 640;
const chartHeight = 160;

function buildPath(points: PricePoint[]): string {
  const prices = points
    .map((point) => point.price_usdt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (prices.length === 0) {
    return "";
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min || max || 1;
  const coords = prices.map((price, index) => ({
    x: (index / Math.max(1, prices.length - 1)) * chartWidth,
    y: chartHeight - ((price - min) / spread) * (chartHeight - 24) - 12,
  }));

  const line = coords.reduce((path, point, index, all) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = all[index - 1] as { x: number; y: number };
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  return line;
}

export function MarketCard({
  history,
  isLoading,
  market,
}: {
  history: PricePoint[] | undefined;
  isLoading?: boolean;
  market: MarketSnapshot | undefined;
}) {
  const points = history ?? [];
  const path = buildPath(points);
  const change = market?.change_24h_percent ?? 0;
  const positive = change >= 0;
  const last = points.at(-1);

  return (
    <div className="corner-frame corner-frame-card relative col-span-2 flex min-h-44 flex-col rounded-[6px] p-1.5 lg:col-span-4">
      <div className="relative flex-1 overflow-hidden rounded-[4px] bg-surface p-5">
        {isLoading && points.length === 0 ? (
          <Skeleton className="absolute inset-0" height="100%" />
        ) : points.length > 0 ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            <motion.path
              animate={{ opacity: 0.32, pathLength: 1 }}
              d={path}
              fill="none"
              initial={{ opacity: 0, pathLength: 0 }}
              stroke="var(--foreground)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.4}
              transition={{ duration: 0.9, ease: "easeOut" }}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}

        <div className="relative z-10">
          <p className="font-medium font-mono text-[11px] text-muted uppercase tracking-[0.14em]">
            Qubic
          </p>
          <div className="mt-4 font-semibold text-4xl tabular-nums tracking-tight sm:text-5xl">
            {market || !isLoading ? (
              <AnimatedNumber
                format={{
                  currency: "USD",
                  maximumFractionDigits: 8,
                  minimumFractionDigits: 0,
                  style: "currency",
                }}
                value={market?.price_usd}
              />
            ) : (
              <Skeleton height="1em" width="10ch" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.04em]">
            <span
              className={classNames(
                "rounded-[3px] px-2 py-1 font-mono",
                positive ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
              )}
            >
              {formatPercent(change)} 24h
            </span>
            {last?.timestamp ? (
              <span className="text-muted">
                last{" "}
                {new Date(last.timestamp).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </span>
            ) : (
              <span className="text-muted">price history pending</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
