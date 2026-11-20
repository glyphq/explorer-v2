import type {
  BppColony,
  BppEpochMeta,
  BppHour,
  BppHourStatus,
  BppRace,
  BppRaceSnapshot,
  BppSnapshot,
} from "./types";

const UPSTREAM = "https://annexplorer.jetskipool.ai/api/v1";
const TIMEOUT_MS = 10_000;
const PAGE_SIZE = 200;
const CONTEXT_TTL_MS = 30_000;

interface TickResponse {
  tickInfo?: {
    epoch?: number;
  };
}

interface EpochResponse {
  metadata?: {
    coreVersion?: string;
  };
  solutions?: number;
  verification?: {
    verified?: number;
  };
}

interface OverviewHour {
  decision: number | null;
  down: number;
  expected: number | null;
  hour: number;
  participants: number;
  status: BppHourStatus;
  targetUnix: number;
  up: number;
}

interface RankingItem {
  bestScore: number;
  bestShift: number;
  computorId: string;
}

interface OverviewResponse {
  generatedAt?: string;
  hypotheticalAccuracy?: {
    minimumComputors: number;
    agreementPercent: number;
    trainingErrorsMax: number;
    totalHours: number;
    evaluatedHours: number;
    correct: number;
    incorrect: number;
    accuracy: number | null;
    hours: OverviewHour[];
  };
  ranking?: {
    cutoff: number;
    total: number;
    hasMore: boolean;
    items: RankingItem[];
  };
  summary?: {
    globalBestScore?: number;
  };
}

type EpochContext = {
  epoch: number;
  overview: OverviewResponse;
};

let contextCache: { at: number; promise: Promise<EpochContext | null> } | null = null;

async function read<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`${UPSTREAM}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function direction(value: number | null): "up" | "down" | null {
  if (value === 1) {
    return "up";
  }
  if (value === 0) {
    return "down";
  }
  return null;
}

function normalizeHours(epoch: number, hours: OverviewHour[]): BppHour[] {
  return hours.map((hour) => {
    let said: BppHour["said"] = null;
    if (hour.participants > 0) {
      if (hour.up === hour.down) {
        said = "split";
      } else {
        said = hour.up > hour.down ? "up" : "down";
      }
    }
    return {
      at: hour.targetUnix,
      down: hour.down,
      epoch,
      hour: hour.hour,
      said,
      status: hour.status,
      up: hour.up,
      voters: hour.participants,
      went: direction(hour.expected),
    };
  });
}

async function overviewPage(
  epoch: number,
  offset = 0,
  signal?: AbortSignal,
): Promise<OverviewResponse | null> {
  return read<OverviewResponse>(
    `/epochs/${epoch}/ant-colony-overview?limit=${PAGE_SIZE}&offset=${offset}`,
    signal,
  );
}

async function loadContext(): Promise<EpochContext | null> {
  if (contextCache && Date.now() - contextCache.at < CONTEXT_TTL_MS) {
    return contextCache.promise;
  }

  const promise = (async () => {
    const tick = await read<TickResponse>("/live/tick-info");
    const epoch = tick?.tickInfo?.epoch;
    if (!epoch) {
      return null;
    }
    const overview = await overviewPage(epoch);
    return overview ? { epoch, overview } : null;
  })();
  contextCache = { at: Date.now(), promise };
  const context = await promise;
  if (!context) {
    contextCache = null;
  }
  return context;
}

function buildColony(epoch: number, overview: OverviewResponse): BppColony | null {
  const accuracy = overview.hypotheticalAccuracy;
  if (!accuracy) {
    return null;
  }

  const hours = normalizeHours(epoch, accuracy.hours);
  const hoursKnown = hours
    .filter((hour) => hour.status !== "waiting")
    .reduce((latest, hour) => Math.max(latest, hour.hour), 0);

  return {
    agreement: accuracy.agreementPercent,
    bar: accuracy.trainingErrorsMax,
    epoch,
    hours,
    hoursKnown,
    minimum: accuracy.minimumComputors,
    scored: {
      accuracy: accuracy.accuracy,
      correct: accuracy.correct,
      incorrect: accuracy.incorrect,
    },
    totalHours: accuracy.totalHours,
  };
}

async function buildBoard(
  epoch: number,
  overview: OverviewResponse,
  signal?: AbortSignal,
): Promise<RankingItem[]> {
  const items = [...(overview.ranking?.items ?? [])];
  const total = overview.ranking?.total ?? items.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const offsets = Array.from(
    { length: Math.max(0, pageCount - 1) },
    (_, index) => (index + 1) * PAGE_SIZE,
  ).filter((offset) => offset <= 4000);
  const pages = await Promise.all(offsets.map((offset) => overviewPage(epoch, offset, signal)));
  for (const page of pages) {
    if (page?.ranking) {
      items.push(...page.ranking.items);
    }
  }

  const unique = new Map<string, RankingItem>();
  for (const item of items) {
    unique.set(item.computorId, item);
  }
  return [...unique.values()];
}

function buildRace(
  overview: OverviewResponse,
  accuracy: NonNullable<OverviewResponse["hypotheticalAccuracy"]>,
  board: RankingItem[],
): BppRace {
  return {
    at: overview.generatedAt ?? new Date().toISOString(),
    bar: accuracy.trainingErrorsMax,
    best:
      overview.summary?.globalBestScore ??
      board.reduce((best, entry) => Math.min(best, entry.bestScore), Number.POSITIVE_INFINITY),
    board: board.map((item) => ({
      errors: item.bestScore,
      frame: item.bestShift,
      id: item.computorId,
    })),
    computors: overview.ranking?.total ?? board.length,
    quorum: overview.ranking?.cutoff ?? 0,
    ready: board.filter((entry) => entry.bestScore <= accuracy.trainingErrorsMax).length,
  };
}

export async function readCoreSnapshot(signal?: AbortSignal): Promise<BppSnapshot> {
  const context = await loadContext();
  if (!context) {
    throw new Error("BPP-9000 data is not answering right now.");
  }

  const { epoch, overview } = context;
  const epochInfo = await read<EpochResponse>(`/epochs/${epoch}`, signal);
  const colony = buildColony(epoch, overview);
  if (!colony) {
    throw new Error("BPP-9000 data is not answering right now.");
  }

  const meta: BppEpochMeta | null = epochInfo
    ? {
        coreVersion: epochInfo.metadata?.coreVersion ?? "unknown",
        solutions: epochInfo.solutions ?? 0,
        verified: epochInfo.verification?.verified ?? 0,
      }
    : null;

  return {
    colony,
    fetchedAt: new Date().toISOString(),
    meta,
    race: null,
  };
}

export async function readRaceSnapshot(signal?: AbortSignal): Promise<BppRaceSnapshot> {
  const context = await loadContext();
  const accuracy = context?.overview.hypotheticalAccuracy;
  if (!(context && accuracy && context.overview.ranking)) {
    throw new Error("BPP-9000 data is not answering right now.");
  }

  const board = await buildBoard(context.epoch, context.overview, signal);
  return {
    fetchedAt: new Date().toISOString(),
    race: buildRace(context.overview, accuracy, board),
  };
}
