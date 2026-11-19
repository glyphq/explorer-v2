import moment from "moment";

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

export function formatQu(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)} QU`;
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
  const date = moment.utc(value);
  return date.isValid() ? date.format("DD MMM YYYY, HH:mm:ss [UTC]") : "—";
}

export function formatDate(value: string | null | undefined): string {
  const date = moment.utc(value);
  return date.isValid() ? date.format("DD MMM YYYY") : "—";
}

export function formatHour(value: string | null | undefined): string {
  const date = moment.utc(value);
  return date.isValid() ? date.format("HH:mm") : "—";
}

export function formatRelativeTime(value: string | null | undefined): string {
  const date = moment.utc(value);
  return date.isValid() ? date.fromNow() : "—";
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
