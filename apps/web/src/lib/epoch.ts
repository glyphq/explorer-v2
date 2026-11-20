const EPOCH_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH_RESET_DAY = 3; // Wednesday
const EPOCH_RESET_HOUR_UTC = 12; // 12:00 PM UTC

export interface EpochProgress {
  end: Date;
  progress: number;
  start: Date;
}

export function getEpochProgress(now = new Date()): EpochProgress {
  const current = now.getTime();
  const daysSinceReset = (now.getUTCDay() - EPOCH_RESET_DAY + 7) % 7;
  let start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceReset,
    EPOCH_RESET_HOUR_UTC,
  );

  if (start > current) {
    start -= EPOCH_WEEK_MS;
  }

  const end = start + EPOCH_WEEK_MS;

  return {
    end: new Date(end),
    progress: Math.min(1, Math.max(0, (current - start) / EPOCH_WEEK_MS)),
    start: new Date(start),
  };
}
