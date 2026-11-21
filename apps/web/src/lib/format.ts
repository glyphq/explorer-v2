const numberFormatter = new Intl.NumberFormat("en-US");

const compactFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact",
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 8,
  minimumFractionDigits: 0,
  style: "currency",
});

const usdValueFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const tinyUsdValueFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 6,
  minimumFractionDigits: 2,
  style: "currency",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  timeZoneName: "short",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const hourFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const compactDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return compactFormatter.format(value);
}

export function countLabel(
  value: number | null | undefined,
  singular: string,
  plural = `${singular}s`,
): string {
  const count =
    value === null || value === undefined || !Number.isFinite(value) ? undefined : value;
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}

export function formatQu(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)} QUBIC`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return usdFormatter.format(value);
}

export function formatUsdValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return Math.abs(value) > 0 && Math.abs(value) < 0.01
    ? tinyUsdValueFormatter.format(value)
    : usdValueFormatter.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(digits)}%`;
}

export function formatTimestamp(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : "—";
}

export function formatHour(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? hourFormatter.format(date) : "—";
}

export function formatTime(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? timeFormatter.format(date) : "—";
}

export function formatTimestampCompact(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? compactDateTimeFormatter.format(date) : "—";
}

export function formatRelativeTime(value: string | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return "—";
  }

  const difference = date.getTime() - Date.now();
  const absolute = Math.abs(difference);

  if (absolute < 60_000) {
    return relativeTimeFormatter.format(Math.round(difference / 1_000), "second");
  }
  if (absolute < 3_600_000) {
    return relativeTimeFormatter.format(Math.round(difference / 60_000), "minute");
  }
  if (absolute < 86_400_000) {
    return relativeTimeFormatter.format(Math.round(difference / 3_600_000), "hour");
  }
  if (absolute < 604_800_000) {
    return relativeTimeFormatter.format(Math.round(difference / 86_400_000), "day");
  }
  if (absolute < 2_629_800_000) {
    return relativeTimeFormatter.format(Math.round(difference / 604_800_000), "week");
  }
  if (absolute < 31_557_600_000) {
    return relativeTimeFormatter.format(Math.round(difference / 2_629_800_000), "month");
  }

  return relativeTimeFormatter.format(Math.round(difference / 31_557_600_000), "year");
}

export function shorten(value: string | null | undefined, head = 6, tail = 4): string {
  if (!value) {
    return "—";
  }
  if (value.length <= head + tail + 3) {
    return value;
  }
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${Math.round(seconds % 60)}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
