"use client";

import { Chip } from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { classNames, formatInteger } from "@/lib/format";

import { formatClock, formatDayLabel, formatHourRange } from "./format-time";
import { callLabel, directionLabel, majorityShare, orderHours, statusLabel } from "./model";
import type { BppColony, BppHour, BppHourStatus } from "./types";

const DAY_SECONDS = 86_400;
const MAIN_HEIGHT = 220;
const VOLUME_HEIGHT = 54;

function callBarClass(hour: BppHour): string {
  if (hour.said === "up") {
    return "bg-success";
  }
  if (hour.said === "down") {
    return "bg-danger";
  }
  return "bg-foreground/25";
}

function resultClass(status: BppHourStatus): string {
  if (status === "correct") {
    return "bg-success/60";
  }
  if (status === "incorrect") {
    return "bg-danger/60";
  }
  if (status === "no_consensus") {
    return "bg-foreground/20";
  }
  return "bg-surface-secondary";
}

function statusTextClass(status: BppHourStatus): string {
  if (status === "correct") {
    return "text-success";
  }
  if (status === "incorrect") {
    return "text-danger";
  }
  return "text-muted";
}

function hourSummary(hour: BppHour): string {
  const pieces = [`Hour ${hour.hour}`, formatHourRange(hour.at), callLabel(hour.said)];
  if (hour.voters > 0) {
    pieces.push(
      `${(majorityShare(hour) ?? 0).toFixed(0)}% agreed`,
      `${formatInteger(hour.voters)} votes`,
      `${formatInteger(hour.up)} up`,
      `${formatInteger(hour.down)} down`,
      `BTC ${directionLabel(hour.went).toLowerCase()}`,
      statusLabel(hour.status),
    );
  } else {
    pieces.push("No votes yet");
  }
  return pieces.join(" · ");
}

function dayGroups(hours: BppHour[]) {
  const groups: { at: number; count: number }[] = [];
  for (const hour of hours) {
    const at = Math.floor(hour.at / DAY_SECONDS) * DAY_SECONDS;
    const previous = groups.at(-1);
    if (previous?.at === at) {
      previous.count += 1;
    } else {
      groups.push({ at, count: 1 });
    }
  }
  return groups;
}

function Readout({ hour }: { hour: BppHour | null }) {
  if (!hour) {
    return null;
  }

  const share = majorityShare(hour) ?? 0;

  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="font-medium text-foreground">Hour {hour.hour}</span>
      <span className="text-muted text-xs tabular-nums">
        {formatClock(hour.at)}–{formatClock(hour.at + 3600)} UTC
      </span>
      <span
        className={classNames(
          "font-medium text-xs",
          hour.said === "up" && "text-success",
          hour.said === "down" && "text-danger",
          hour.said !== "up" && hour.said !== "down" && "text-muted",
        )}
      >
        {callLabel(hour.said)}
      </span>
      {hour.voters > 0 ? (
        <>
          <span className="text-muted text-xs">{share.toFixed(0)}% agreed</span>
          <span className="text-muted text-xs tabular-nums">
            {formatInteger(hour.voters)} votes · {formatInteger(hour.up)} up /{" "}
            {formatInteger(hour.down)} down
          </span>
          <span className="text-muted text-xs">BTC {directionLabel(hour.went).toLowerCase()}</span>
          <span className={classNames("font-medium text-xs", statusTextClass(hour.status))}>
            {statusLabel(hour.status)}
          </span>
        </>
      ) : (
        <span className="text-muted text-xs">No votes yet</span>
      )}
    </div>
  );
}

export function CallTape({ colony, now }: { colony: BppColony | null; now: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const hours = useMemo(
    () => (colony ? orderHours(colony.hours).filter((hour) => hour.at <= now) : []),
    [colony, now],
  );
  const days = useMemo(() => dayGroups(hours), [hours]);

  useEffect(() => {
    const element = scroller.current;
    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, [hours.length]);

  if (!colony || hours.length === 0) {
    return null;
  }

  const current =
    hours.find((hour) => hour.at <= now && now < hour.at + 3600) ?? hours.at(-1) ?? null;
  const active = hours.find((hour) => hour.hour === selected) ?? current ?? hours[0];
  const counted = hours.filter((hour) => hour.voters >= colony.minimum && hour.said !== "split");
  const scaleHours = counted.length > 0 ? counted : hours;
  const maxShare = Math.max(55, ...scaleHours.map((hour) => majorityShare(hour) ?? 50));
  const yMax = Math.min(100, Math.max(60, Math.ceil((maxShare + 1) / 5) * 5));
  const range = yMax - 50;
  const ticks = Array.from({ length: Math.floor(range / 5) + 1 }, (_, index) => 50 + index * 5);
  const maxVoters = Math.max(100, ...hours.map((hour) => hour.voters));
  const currentIndex = current ? hours.findIndex((hour) => hour.hour === current.hour) : -1;
  const activeIndex = active ? hours.findIndex((hour) => hour.hour === active.hour) : -1;

  const percentFromBase = (value: number) => ((value - 50) / range) * 100;
  const thresholdTop = percentFromBase(colony.agreement);
  const minVoteBottom = (100 / maxVoters) * 100;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-foreground text-xl">Call tape</h2>
          <p className="mt-1 text-muted text-sm">Consensus strength, turnout and result by hour.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" variant="soft">
            {hours.length} hours
          </Chip>
          <Chip size="sm" variant="soft">
            {colony.agreement}% threshold
          </Chip>
        </div>
      </div>

      <Readout hour={active} />

      <div className="mt-4 flex gap-2">
        <div
          aria-hidden="true"
          className="relative w-8 shrink-0 text-right text-[10px] text-muted tabular-nums"
          style={{ height: MAIN_HEIGHT }}
        >
          {ticks.map((tick) => (
            <span
              className="absolute right-0 -translate-y-1/2 pr-1"
              key={tick}
              style={{ top: `${100 - percentFromBase(tick)}%` }}
            >
              {tick}%
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto pb-1" ref={scroller}>
          <div style={{ minWidth: Math.max(240, hours.length * 8) }}>
            <div className="relative border-foreground/10 border-b" style={{ height: MAIN_HEIGHT }}>
              {ticks.map((tick) => (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 left-0 border-t border-foreground/5"
                  key={tick}
                  style={{ bottom: `${percentFromBase(tick)}%` }}
                />
              ))}

              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 left-0 border-foreground/30 border-t border-dashed"
                style={{ bottom: `${thresholdTop}%` }}
              />

              {currentIndex >= 0 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 bg-foreground/[0.025]"
                  style={{
                    left: `${(currentIndex / hours.length) * 100}%`,
                    width: `${100 / hours.length}%`,
                  }}
                />
              ) : null}

              <div className="absolute inset-0 flex">
                {hours.map((hour) => {
                  const share = majorityShare(hour);
                  const height = share === null ? 0 : Math.min(100, percentFromBase(share));
                  const counted = hour.voters >= colony.minimum && hour.said !== "split";

                  return (
                    <div className="relative h-full flex-1" key={hour.hour}>
                      {!counted ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-foreground/20"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={classNames(
                            "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[1px] transition-opacity",
                            callBarClass(hour),
                            hour.hour === active.hour ? "opacity-100" : "opacity-80",
                          )}
                          style={{
                            height: `${Math.max(height, 0.6)}%`,
                            width: "min(58%, 16px)",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {activeIndex >= 0 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/40"
                  style={{
                    left: `${((activeIndex + 0.5) / hours.length) * 100}%`,
                  }}
                />
              ) : null}

              <div className="absolute inset-0 z-20 flex">
                {hours.map((hour) => (
                  <button
                    aria-label={hourSummary(hour)}
                    className="h-full flex-1 focus-visible:bg-foreground/5 focus-visible:outline-none"
                    key={hour.hour}
                    onClick={() => setSelected(hour.hour)}
                    onFocus={() => setSelected(hour.hour)}
                    onMouseEnter={() => setSelected(hour.hour)}
                    title={hourSummary(hour)}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="mt-2 flex h-1.5 gap-px" aria-hidden="true">
              {hours.map((hour) => (
                <span
                  className={classNames("h-full flex-1 rounded-[1px]", resultClass(hour.status))}
                  key={hour.hour}
                  title={statusLabel(hour.status)}
                />
              ))}
            </div>

            <div
              className="relative mt-2 border-foreground/10 border-b"
              style={{ height: VOLUME_HEIGHT }}
            >
              {maxVoters >= 100 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 left-0 border-foreground/20 border-t border-dashed"
                  style={{ bottom: `${minVoteBottom}%` }}
                />
              ) : null}

              <div className="absolute inset-0 flex items-end">
                {hours.map((hour) => (
                  <div
                    className="relative flex h-full flex-1 items-end justify-center"
                    key={hour.hour}
                  >
                    {hour.voters > 0 ? (
                      <span
                        aria-hidden="true"
                        className={classNames(
                          "rounded-t-[1px]",
                          callBarClass(hour),
                          hour.hour === active.hour ? "opacity-70" : "opacity-40",
                        )}
                        style={{
                          height: `${Math.max(1.5, (hour.voters / maxVoters) * 100)}%`,
                          width: "min(58%, 16px)",
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 flex text-muted text-xs">
              {days.map((day) => (
                <span
                  className="whitespace-nowrap border-foreground/10 border-l pl-1"
                  key={day.at}
                  style={{ flexGrow: day.count, flexBasis: 0 }}
                >
                  {formatDayLabel(day.at)}
                </span>
              ))}
            </div>

            <div className="mt-1 flex text-[10px] text-muted/70 tabular-nums">
              {hours.map((hour, index) => (
                <span className="flex-1 text-center" key={hour.hour}>
                  {index % 3 === 0 ? formatClock(hour.at).slice(0, 2) : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[1px] bg-success" />
          Up call
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[1px] bg-danger" />
          Down call
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[1px] bg-foreground/25" />
          No call
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-foreground/30 border-t border-dashed" />
          Call threshold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted">Result</span>
          <span className="size-2 rounded-[1px] bg-success/60" />
          <span>right</span>
          <span className="size-2 rounded-[1px] bg-danger/60" />
          <span>wrong</span>
          <span className="size-2 rounded-[1px] bg-foreground/20" />
          <span>no consensus</span>
        </span>
        <span>Volume = voters · dashed 100 min</span>
      </div>
    </section>
  );
}
