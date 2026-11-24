export type CallDirection = "up" | "down";
export type CallOutcome = "correct" | "incorrect";

export interface OverviewHour {
  down: number;
  expected: number | null;
  hour: number;
  participants: number;
  status: string;
  targetUnix: number;
  up: number;
}

interface AccuracySummary {
  accuracy?: number | null;
  agreementPercent: number;
  correct?: number;
  hours: OverviewHour[];
  incorrect?: number;
  minimumComputors: number;
}

export interface BppOverview {
  hypotheticalAccuracy?: AccuracySummary;
}

export interface CallAnnouncement {
  closesAt: number;
  down: number;
  epoch: number;
  hour: number;
  said: CallDirection;
  share: number;
  targetUnix: number;
  up: number;
}

export interface Accuracy {
  correct: number;
  incorrect: number;
  percent: number | null;
}

export interface ResultAnnouncement {
  accuracy: Accuracy;
  closesAt: number;
  down: number;
  epoch: number;
  hour: number;
  outcome: CallOutcome;
  said: CallDirection;
  share: number;
  targetUnix: number;
  up: number;
  went: CallDirection | null;
}

export interface PushPayload {
  [key: string]: string | number;
  body: string;
  tag: string;
  timestamp: number;
  title: string;
  url: string;
}

const TRAILING_SLASH = /\/$/;

// Results can arrive a few cron runs after the hour closes; older hours are
// not backfilled so a fresh deploy does not announce yesterday's call.
const RESULT_WINDOW_SECONDS = 6 * 3600;
const SCORED_STATUS: Record<string, true> = { correct: true, incorrect: true };

function voteDirection(hour: OverviewHour): CallDirection | "split" | null {
  if (hour.participants === 0) {
    return null;
  }
  if (hour.up === hour.down) {
    return "split";
  }
  return hour.up > hour.down ? "up" : "down";
}

function actualDirection(expected: number | null): CallDirection | null {
  if (expected === 1) {
    return "up";
  }
  if (expected === 0) {
    return "down";
  }
  return null;
}

function majorityShare(hour: OverviewHour): number {
  if (hour.participants === 0) {
    return 0;
  }
  return (Math.max(hour.up, hour.down) / hour.participants) * 100;
}

function accuracySummary(summary: AccuracySummary): Accuracy {
  const correct = summary.correct ?? 0;
  const incorrect = summary.incorrect ?? 0;
  const scored = correct + incorrect;
  return {
    correct,
    incorrect,
    percent: scored > 0 ? (correct / scored) * 100 : null,
  };
}

/**
 * Finds the open hour whose computors reached the same consensus the explorer
 * requires: enough participants and at least the configured majority.
 */
export function detectCall(
  epoch: number,
  overview: BppOverview,
  nowSeconds: number,
): CallAnnouncement | null {
  const accuracy = overview.hypotheticalAccuracy;
  if (!accuracy) {
    return null;
  }

  const hour = accuracy.hours.find(
    (entry) =>
      entry.targetUnix <= nowSeconds &&
      nowSeconds < entry.targetUnix + 3600 &&
      entry.participants >= accuracy.minimumComputors,
  );
  if (!hour) {
    return null;
  }

  const said = voteDirection(hour);
  if (said !== "up" && said !== "down") {
    return null;
  }

  const share = majorityShare(hour);
  if (share < accuracy.agreementPercent) {
    return null;
  }

  return {
    closesAt: hour.targetUnix + 3600,
    down: hour.down,
    epoch,
    hour: hour.hour,
    said,
    share,
    targetUnix: hour.targetUnix,
    up: hour.up,
  };
}

/** Finds the most recent closed hour that the source has already scored. */
export function detectResult(
  epoch: number,
  overview: BppOverview,
  nowSeconds: number,
): ResultAnnouncement | null {
  const accuracy = overview.hypotheticalAccuracy;
  if (!accuracy) {
    return null;
  }

  const [hour] = accuracy.hours
    .filter(
      (entry) =>
        entry.targetUnix + 3600 <= nowSeconds &&
        nowSeconds <= entry.targetUnix + 3600 + RESULT_WINDOW_SECONDS &&
        SCORED_STATUS[entry.status],
    )
    .sort((left, right) => right.targetUnix - left.targetUnix);
  if (!hour) {
    return null;
  }

  const said = voteDirection(hour);
  if (said !== "up" && said !== "down") {
    return null;
  }

  return {
    accuracy: accuracySummary(accuracy),
    closesAt: hour.targetUnix + 3600,
    down: hour.down,
    epoch,
    hour: hour.hour,
    outcome: hour.status as CallOutcome,
    said,
    share: majorityShare(hour),
    targetUnix: hour.targetUnix,
    up: hour.up,
    went: actualDirection(hour.expected),
  };
}

function siteUrl(value: string | undefined): string {
  return (value && value.length > 0 ? value : "https://explorer.glyphq.org").replace(
    TRAILING_SLASH,
    "",
  );
}

function clock(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(11, 16);
}

function directionLabel(direction: CallDirection): string {
  return direction === "up" ? "UP" : "DOWN";
}

function accuracyLabel(accuracy: Accuracy): string {
  if (accuracy.percent === null) {
    return "no scored accuracy yet";
  }
  return `${accuracy.percent.toFixed(0)}% accuracy (${accuracy.correct} right / ${accuracy.incorrect} wrong)`;
}

export function pushPayload(announcement: CallAnnouncement, site: string | undefined): PushPayload {
  return {
    body: `${announcement.up} up · ${announcement.down} down · closes ${clock(announcement.closesAt)} UTC`,
    tag: `bpp-${announcement.epoch}-${announcement.hour}`,
    timestamp: announcement.targetUnix * 1000,
    title: `BPP-9000: Bitcoin ${directionLabel(announcement.said)} · ${announcement.share.toFixed(0)}% agreement`,
    url: `${siteUrl(site)}/bpp9000`,
  };
}

export function resultPushPayload(
  announcement: ResultAnnouncement,
  site: string | undefined,
): PushPayload {
  const call = directionLabel(announcement.said);
  const verdict = announcement.outcome === "correct" ? "RIGHT" : "WRONG";
  const close = announcement.went ? `BTC closed ${announcement.went}` : "Hour closed";
  return {
    body: `${close} · ${announcement.share.toFixed(0)}% agreement · ${accuracyLabel(announcement.accuracy)}`,
    tag: `bpp-result-${announcement.epoch}-${announcement.hour}`,
    timestamp: announcement.closesAt * 1000,
    title: `BPP-9000: Bitcoin ${call} call was ${verdict}`,
    url: `${siteUrl(site)}/bpp9000`,
  };
}

export function discordPayload(
  announcement: CallAnnouncement,
  site: string | undefined,
): { allowed_mentions: { parse: never[] }; content: string } {
  return {
    allowed_mentions: { parse: [] },
    content: [
      `**BPP-9000 · Bitcoin ${directionLabel(announcement.said)} · ${announcement.share.toFixed(0)}% agreement**`,
      `${announcement.up} up · ${announcement.down} down · closes ${clock(announcement.closesAt)} UTC`,
      `${siteUrl(site)}/bpp9000`,
    ].join("\n"),
  };
}

export function resultDiscordPayload(
  announcement: ResultAnnouncement,
  site: string | undefined,
): { allowed_mentions: { parse: never[] }; content: string } {
  const call = directionLabel(announcement.said);
  const verdict = announcement.outcome === "correct" ? "RIGHT" : "WRONG";
  const close = announcement.went ? `BTC closed ${announcement.went}` : "Hour closed";
  return {
    allowed_mentions: { parse: [] },
    content: [
      `**BPP-9000 · Bitcoin ${call} call was ${verdict}**`,
      `${close} · ${announcement.share.toFixed(0)}% agreement · ${accuracyLabel(announcement.accuracy)}`,
      `${siteUrl(site)}/bpp9000`,
    ].join("\n"),
  };
}
