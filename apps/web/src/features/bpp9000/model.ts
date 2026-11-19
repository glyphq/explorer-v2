import type { BppColony, BppDirection, BppHour, BppHourStatus } from "./types";

export const REFRESH_MS = 60_000;

export function hourCloseAt(hour: BppHour): number {
  return hour.at + 3600;
}

export function majorityShare(hour: BppHour): number | null {
  if (hour.voters <= 0) {
    return null;
  }
  return (Math.max(hour.up, hour.down) / hour.voters) * 100;
}

export function hasConsensus(hour: BppHour, minimum: number, agreement: number): boolean {
  return (
    hour.voters >= minimum &&
    hour.said !== null &&
    hour.said !== "split" &&
    (majorityShare(hour) ?? 0) >= agreement
  );
}

export function orderHours(hours: BppHour[]): BppHour[] {
  return [...hours].sort((a, b) => a.at - b.at);
}

export function epochHours(colony: BppColony, nowSeconds: number): BppHour[] {
  const ordered = orderHours(colony.hours);
  const firstAt = ordered[0]?.at ?? nowSeconds - Math.max(0, colony.hoursKnown - 1) * 3600;
  const byHour = new Map(ordered.map((hour) => [hour.hour, hour]));

  return Array.from({ length: colony.totalHours }, (_, index) => {
    const hourNumber = index + 1;
    const existing = byHour.get(hourNumber);
    if (existing) {
      return existing;
    }
    return {
      at: firstAt + index * 3600,
      down: 0,
      epoch: colony.epoch,
      hour: hourNumber,
      said: null,
      status: hourNumber > colony.hoursKnown ? "waiting" : "not_scored",
      up: 0,
      voters: 0,
      went: null,
    } satisfies BppHour;
  });
}

export function accuracyPercent(colony: BppColony): number | null {
  const scored = colony.scored.correct + colony.scored.incorrect;
  if (scored <= 0) {
    return null;
  }
  if (colony.scored.accuracy !== null) {
    return colony.scored.accuracy * 100;
  }
  return (colony.scored.correct / scored) * 100;
}

export function currentHour(hours: BppHour[], nowSeconds: number): BppHour | null {
  const ordered = orderHours(hours);
  const inside = ordered.find((hour) => hour.at <= nowSeconds && nowSeconds < hourCloseAt(hour));
  if (inside) {
    return inside;
  }
  return [...ordered].reverse().find((hour) => hour.voters > 0) ?? ordered.at(-1) ?? null;
}

export function recentDecisions(hours: BppHour[], nowSeconds: number, limit = 8): BppHour[] {
  return orderHours(hours)
    .filter(
      (hour) =>
        hourCloseAt(hour) <= nowSeconds &&
        hour.voters > 0 &&
        hour.said !== null &&
        hour.went !== null,
    )
    .reverse()
    .slice(0, limit);
}

export function statusLabel(status: BppHourStatus): string {
  switch (status) {
    case "correct":
      return "Right";
    case "incorrect":
      return "Wrong";
    case "no_consensus":
      return "No consensus";
    case "not_scored":
      return "Not scored";
    case "waiting":
      return "Waiting";
    default:
      return "Not scored";
  }
}

export function directionLabel(direction: "up" | "down" | null): string {
  if (direction === "up") {
    return "Up";
  }
  if (direction === "down") {
    return "Down";
  }
  return "Not sure";
}

export function callLabel(direction: BppDirection | null): string {
  if (direction === "split") {
    return "Split";
  }
  return directionLabel(direction);
}

export function callHeadline(hour: BppHour, minimum: number, agreement: number): string {
  if (hour.voters === 0) {
    return "Computors have not started voting on this hour yet.";
  }
  if (hour.said === "split") {
    return "The network is split on where Bitcoin goes this hour.";
  }
  if (hour.voters < minimum) {
    return `The network is leaning ${hour.said}, but only ${hour.voters} computors have voted.`;
  }
  if (!hasConsensus(hour, minimum, agreement)) {
    return `The network is leaning ${hour.said}, but has not agreed enough to call it.`;
  }
  return hour.said === "up"
    ? "The network expects Bitcoin to close this hour higher."
    : "The network expects Bitcoin to close this hour lower.";
}
