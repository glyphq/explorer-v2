"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";

import type { ActivityBucket } from "@/lib/api/generated/types.gen";
import { formatCompact, formatHour, formatInteger } from "@/lib/format";

import { AnimatedNumber } from "./animated-number";
import { Skeleton } from "./skeleton";

const width = 920;
const height = 300;
const padding = { bottom: 32, left: 10, right: 10, top: 18 };

type Point = { x: number; y: number };

function smoothPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }
  return points.reduce((path, point, index, all) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = all[index - 1] as Point;
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

export function ActivityChart({
  buckets,
  isLoading,
}: {
  buckets: ActivityBucket[] | undefined;
  isLoading?: boolean;
}) {
  const series = useMemo(() => [...(buckets ?? [])].reverse(), [buckets]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (isLoading && series.length === 0) {
    return <Skeleton height={260} />;
  }

  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted text-sm">
        No activity buckets indexed.
      </div>
    );
  }

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const baseline = padding.top + plotHeight;
  const slot = plotWidth / series.length;
  const barWidth = Math.max(6, slot * 0.58);
  const maxTransactions = Math.max(1, ...series.map((bucket) => bucket.transactions));
  const maxEvents = Math.max(1, ...series.map((bucket) => bucket.events));
  const maxVolume = Math.max(1, ...series.map((bucket) => bucket.volume ?? 0));
  const max = Math.max(maxTransactions, maxEvents);

  const transactionPoints = series.map((bucket, index) => ({
    bucket,
    height: Math.max(1.5, (bucket.transactions / max) * plotHeight),
    index,
    x: padding.left + slot * index + slot / 2,
  }));
  const eventPoints: Point[] = series.map((bucket, index) => ({
    x: padding.left + slot * index + slot / 2,
    y: padding.top + plotHeight - (bucket.events / max) * plotHeight,
  }));
  const volumePoints: Point[] = series.map((bucket, index) => ({
    x: padding.left + slot * index + slot / 2,
    y: baseline - ((bucket.volume ?? 0) / maxVolume) * plotHeight * 0.2,
  }));
  const volumeArea = [
    `M ${volumePoints[0]?.x ?? padding.left} ${baseline}`,
    ...volumePoints.map((point) => `L ${point.x} ${point.y}`),
    `L ${volumePoints.at(-1)?.x ?? width - padding.right} ${baseline}`,
    "Z",
  ].join(" ");

  const totalTransactions = series.reduce((total, bucket) => total + bucket.transactions, 0);
  const totalEvents = series.reduce((total, bucket) => total + bucket.events, 0);
  const totalVolume = series.reduce((total, bucket) => total + (bucket.volume ?? 0), 0);
  const peak = series.reduce(
    (best, bucket) => (bucket.transactions > best.transactions ? bucket : best),
    series[0] as ActivityBucket,
  );
  const active = activeIndex === null ? null : series[activeIndex];
  const activeBandX = activeIndex === null ? 0 : padding.left + slot * activeIndex;
  const activePoint = activeIndex === null ? null : (eventPoints[activeIndex] ?? null);
  const labelIndices = [
    0,
    Math.floor((series.length - 1) / 3),
    Math.floor(((series.length - 1) * 2) / 3),
    series.length - 1,
  ].filter((value, index, all) => all.indexOf(value) === index);
  const tooltipLeft =
    activeIndex === null
      ? 50
      : Math.min(88, Math.max(12, ((padding.left + slot * activeIndex + slot / 2) / width) * 100));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-wrap gap-3">
          <div className="corner-frame w-fit rounded-[4px] p-1">
            <div className="rounded-[3px] bg-surface-secondary/40 px-4 py-3">
              <p className="font-mono text-[10px] text-muted uppercase tracking-[0.14em]">
                Transactions
              </p>
              <p className="mt-2 font-semibold text-2xl tracking-tight">
                <AnimatedNumber
                  format={{ maximumFractionDigits: 2, notation: "compact" }}
                  value={totalTransactions}
                />
              </p>
            </div>
          </div>
          <div className="corner-frame w-fit rounded-[4px] p-1">
            <div className="rounded-[3px] bg-surface-secondary/40 px-4 py-3">
              <p className="font-mono text-[10px] text-muted uppercase tracking-[0.14em]">Events</p>
              <p className="mt-2 font-semibold text-2xl tracking-tight">
                <AnimatedNumber
                  format={{ maximumFractionDigits: 2, notation: "compact" }}
                  value={totalEvents}
                />
              </p>
            </div>
          </div>
          <div className="corner-frame w-fit rounded-[4px] p-1">
            <div className="rounded-[3px] bg-surface-secondary/40 px-4 py-3">
              <p className="font-mono text-[10px] text-muted uppercase tracking-[0.14em]">Volume</p>
              <p className="mt-2 whitespace-nowrap font-semibold text-2xl tracking-tight">
                <AnimatedNumber
                  format={{ maximumFractionDigits: 2, notation: "compact" }}
                  suffix=" QUBIC"
                  value={totalVolume}
                />
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted tracking-[0.04em]">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-1.5 rounded-[2px] bg-accent" />
            Transactions
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full bg-muted" />
            Events
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-[2px] bg-foreground/15" />
            Volume
          </span>
        </div>
      </div>

      <div className="relative mt-5 isolate overflow-hidden [contain:layout_style] [overflow-anchor:none]">
        {active ? (
          <div
            className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 corner-frame rounded-[4px] bg-surface-secondary p-3"
            style={{ left: `clamp(6rem, ${tooltipLeft}%, calc(100% - 6rem))` }}
          >
            <p className="font-mono text-[10px] text-muted tracking-[0.04em]">
              {formatHour(active.bucket)} · {formatInteger(active.ticks)} ticks
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted">Transactions</span>
                <span className="tabular">{formatInteger(active.transactions)}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted">Events</span>
                <span className="tabular">{formatInteger(active.events)}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted">Volume</span>
                <span className="tabular">{formatCompact(active.volume)} QUBIC</span>
              </p>
            </div>
          </div>
        ) : null}

        <svg
          aria-label="Hourly transaction, event and volume activity"
          className="h-auto w-full touch-none"
          onPointerLeave={() => setActiveIndex(null)}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * width;
            const index = Math.floor((x - padding.left) / slot);
            if (index >= 0 && index < series.length) {
              setActiveIndex(index);
            }
          }}
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <line
              key={step}
              stroke="var(--foreground)"
              strokeDasharray="2 8"
              strokeOpacity={step === 0 ? 0.18 : 0.08}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + plotHeight * step}
              y2={padding.top + plotHeight * step}
            />
          ))}

          <motion.path
            animate={{ opacity: 1 }}
            d={volumeArea}
            fill="var(--foreground)"
            fillOpacity={0.12}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />

          {activeIndex === null ? null : (
            <rect
              fill="var(--accent)"
              height={plotHeight}
              opacity={0.07}
              width={slot}
              x={activeBandX}
              y={padding.top}
            />
          )}

          {transactionPoints.map((point) => (
            <motion.rect
              animate={{ height: point.height, y: baseline - point.height }}
              fill="var(--accent)"
              fillOpacity={point.index === activeIndex ? 1 : 0.55}
              initial={{ height: 0, y: baseline }}
              key={point.bucket.bucket}
              rx={1}
              transition={{
                delay: point.index * 0.012,
                duration: 0.45,
                ease: "easeOut",
              }}
              width={barWidth}
              x={point.x - barWidth / 2}
            />
          ))}

          <motion.path
            animate={{ opacity: 0.72, pathLength: 1 }}
            d={smoothPath(eventPoints)}
            fill="none"
            initial={{ opacity: 0, pathLength: 0 }}
            stroke="var(--muted)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.4}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {eventPoints.map((point, index) => (
            <circle
              cx={point.x}
              cy={point.y}
              fill="var(--background)"
              key={series[index]?.bucket}
              r={index === activeIndex ? 3.5 : 2}
              stroke="var(--muted)"
              strokeOpacity={index === activeIndex ? 1 : 0.55}
              strokeWidth={1.2}
            />
          ))}

          {activePoint ? (
            <g>
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                fill="var(--muted)"
                opacity={0.2}
                r={9}
              />
              <circle cx={activePoint.x} cy={activePoint.y} fill="var(--muted)" r={3.5} />
            </g>
          ) : null}

          {labelIndices.map((index) => {
            const bucket = series[index];
            if (!bucket) {
              return null;
            }
            return (
              <text
                fill="var(--muted)"
                fontFamily="var(--font-mono, monospace)"
                fontSize="9"
                key={bucket.bucket}
                textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}
                x={padding.left + slot * index + (index === 0 ? 0 : slot / 2)}
                y={height - 10}
              >
                {formatHour(bucket.bucket)}
              </text>
            );
          })}

          <text
            fill="var(--muted)"
            fontFamily="var(--font-mono, monospace)"
            fontSize="9"
            textAnchor="end"
            x={width - padding.right}
            y={padding.top + 2}
          >
            peak {formatCompact(peak.transactions)} tx
          </text>
        </svg>
      </div>

      <p className="mt-3 text-[10px] text-muted uppercase tracking-[0.14em]">
        {formatDateTimeRange(series)}
      </p>
    </div>
  );
}

function formatDateTimeRange(series: ActivityBucket[]): string {
  const first = series[0];
  const last = series.at(-1);
  if (!(first && last)) {
    return "";
  }
  return `${formatHour(first.bucket)} — ${formatHour(last.bucket)} local · ${series.length} hourly buckets`;
}
