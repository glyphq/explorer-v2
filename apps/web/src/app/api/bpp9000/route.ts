import type {
  BppColony,
  BppEpochMeta,
  BppHour,
  BppHourStatus,
  BppRace,
  BppRaceSnapshot,
  BppSnapshot,
} from "@/features/bpp9000/types";

const UPSTREAM = "https://annexplorer.jetskipool.ai/api/v1";
const TIMEOUT_MS = 10_000;
const PAGE_SIZE = 200;
const CORE_CACHE_SECONDS = 240;
const RACE_CACHE_SECONDS = 600;

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

async function read<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const response = await fetch(`${UPSTREAM}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
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

async function currentEpoch(): Promise<number | null> {
  const tick = await read<TickResponse>("/live/tick-info", 15);
  return tick?.tickInfo?.epoch ?? null;
}

async function overviewPage(epoch: number, offset = 0): Promise<OverviewResponse | null> {
  return read<OverviewResponse>(
    `/epochs/${epoch}/ant-colony-overview?limit=${PAGE_SIZE}&offset=${offset}`,
    60,
  );
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

async function buildBoard(epoch: number, overview: OverviewResponse): Promise<RankingItem[]> {
  const items = [...(overview.ranking?.items ?? [])];
  const total = overview.ranking?.total ?? items.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const offsets = Array.from(
    { length: Math.max(0, pageCount - 1) },
    (_, index) => (index + 1) * PAGE_SIZE,
  ).filter((offset) => offset <= 4000);
  const pages = await Promise.all(offsets.map((offset) => overviewPage(epoch, offset)));
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

async function coreSnapshot(): Promise<Response> {
  const epoch = await currentEpoch();
  if (!epoch) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const [epochInfo, overview] = await Promise.all([
    read<EpochResponse>(`/epochs/${epoch}`, 300),
    overviewPage(epoch),
  ]);

  if (!overview) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const colony = buildColony(epoch, overview);
  if (!colony) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const meta: BppEpochMeta | null = epochInfo
    ? {
        coreVersion: epochInfo.metadata?.coreVersion ?? "unknown",
        solutions: epochInfo.solutions ?? 0,
        verified: epochInfo.verification?.verified ?? 0,
      }
    : null;

  const snapshot: BppSnapshot = {
    colony,
    fetchedAt: new Date().toISOString(),
    meta,
    race: null,
  };

  return Response.json(snapshot);
}

async function raceSnapshot(): Promise<Response> {
  const epoch = await currentEpoch();
  if (!epoch) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const overview = await overviewPage(epoch);
  const accuracy = overview?.hypotheticalAccuracy;
  if (!(accuracy && overview?.ranking)) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const board = await buildBoard(epoch, overview);
  const snapshot: BppRaceSnapshot = {
    fetchedAt: new Date().toISOString(),
    race: buildRace(overview, accuracy, board),
  };

  return Response.json(snapshot);
}

export const dynamic = "force-dynamic";

async function withEdgeCache(
  request: Request,
  ttlSeconds: number,
  build: () => Promise<Response>,
): Promise<Response> {
  const cache = typeof caches === "undefined" ? undefined : await caches.open("glyph-bpp9000");
  if (!cache) {
    return build();
  }

  const cacheUrl = new URL(request.url);
  cacheUrl.search = `?part=${cacheUrl.searchParams.get("part") ?? "core"}`;
  const key = new Request(cacheUrl, { method: "GET" });
  const cached = await cache.match(key).catch(() => undefined);
  if (cached) {
    const hit = new Response(cached.body, {
      headers: cached.headers,
      status: cached.status,
      statusText: cached.statusText,
    });
    hit.headers.set("x-glyph-cache", "hit");
    return hit;
  }

  const response = await build();
  if (!response.ok) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set(
    "Cache-Control",
    `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`,
  );
  headers.set("x-glyph-cache", "miss");
  const cacheable = new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
  await cache.put(key, cacheable.clone()).catch(() => undefined);
  return cacheable;
}

export async function GET(request: Request) {
  const part = new URL(request.url).searchParams.get("part") ?? "core";
  if (part === "core") {
    return withEdgeCache(request, CORE_CACHE_SECONDS, coreSnapshot);
  }
  if (part === "race") {
    return withEdgeCache(request, RACE_CACHE_SECONDS, raceSnapshot);
  }
  return Response.json({ error: "Unknown BPP-9000 part." }, { status: 400 });
}
