import type {
  BppColony,
  BppEpochMeta,
  BppHour,
  BppHourStatus,
  BppRace,
  BppSnapshot,
} from "@/features/bpp9000/types";

const UPSTREAM = "https://annexplorer.jetskipool.ai/api/v1";
const TIMEOUT_MS = 10_000;
const PAGE_SIZE = 200;

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

async function read<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${UPSTREAM}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
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

export const dynamic = "force-dynamic";

export async function GET() {
  const tick = await read<TickResponse>("/live/tick-info");
  const epoch = tick?.tickInfo?.epoch;
  if (!epoch) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const [epochInfo, overview] = await Promise.all([
    read<EpochResponse>(`/epochs/${epoch}`),
    read<OverviewResponse>(`/epochs/${epoch}/ant-colony-overview?limit=${PAGE_SIZE}&offset=0`),
  ]);

  const accuracy = overview?.hypotheticalAccuracy;
  if (!(accuracy && overview?.ranking)) {
    return Response.json({ error: "BPP-9000 data is not answering right now." }, { status: 502 });
  }

  const items = [...overview.ranking.items];
  const pageCount = Math.ceil(overview.ranking.total / PAGE_SIZE);
  const offsets = Array.from(
    { length: Math.max(0, pageCount - 1) },
    (_, index) => (index + 1) * PAGE_SIZE,
  ).filter((offset) => offset <= 4000);
  const pages = await Promise.all(
    offsets.map((offset) =>
      read<OverviewResponse>(
        `/epochs/${epoch}/ant-colony-overview?limit=${PAGE_SIZE}&offset=${offset}`,
      ),
    ),
  );
  for (const page of pages) {
    if (page?.ranking) {
      items.push(...page.ranking.items);
    }
  }

  const unique = new Map<string, RankingItem>();
  for (const item of items) {
    unique.set(item.computorId, item);
  }

  const board = [...unique.values()].map((item) => ({
    errors: item.bestScore,
    frame: item.bestShift,
    id: item.computorId,
  }));
  const hours = normalizeHours(epoch, accuracy.hours);
  const hoursKnown = hours
    .filter((hour) => hour.status !== "waiting")
    .reduce((latest, hour) => Math.max(latest, hour.hour), 0);

  const colony: BppColony = {
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

  const race: BppRace = {
    at: overview.generatedAt ?? new Date().toISOString(),
    bar: accuracy.trainingErrorsMax,
    best:
      overview.summary?.globalBestScore ??
      board.reduce((best, entry) => Math.min(best, entry.errors), Number.POSITIVE_INFINITY),
    board,
    computors: overview.ranking.total,
    quorum: overview.ranking.cutoff,
    ready: board.filter((entry) => entry.errors <= accuracy.trainingErrorsMax).length,
  };

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
    race,
  };

  return Response.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
