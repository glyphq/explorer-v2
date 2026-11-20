"use client";

import { AsciiSkeleton } from "ascii-reveal";
import { motion } from "motion/react";

import { AnimatedNumber } from "@/components/explorer/animated-number";
import type { MarketSnapshot, PricePoint } from "@/lib/api/generated/types.gen";
import { classNames, formatPercent } from "@/lib/format";

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
    <div className="relative col-span-2 min-h-44 overflow-hidden rounded-xl bg-surface p-5 lg:col-span-4">
      {isLoading && points.length === 0 ? (
        <AsciiSkeleton
          as="div"
          className="absolute inset-0"
          height="100%"
          rows={6}
          variant="dither"
          width="100%"
        />
      ) : points.length > 0 ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <motion.path
            animate={{ opacity: 0.55, pathLength: 1 }}
            d={path}
            fill="none"
            initial={{ opacity: 0, pathLength: 0 }}
            stroke={positive ? "var(--success)" : "var(--danger)"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.4}
            transition={{ duration: 0.9, ease: "easeOut" }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      <div className="relative z-10">
        <p className="font-medium text-[10px] text-muted uppercase tracking-[0.18em]">QUBIC</p>
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
            <AsciiSkeleton lines={1} widths={["10ch"]} />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.14em]">
          <span
            className={classNames(
              "rounded-full px-2 py-1",
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
  );
}
