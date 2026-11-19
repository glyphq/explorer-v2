const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatClock(unixSeconds: number): string {
  return clockFormatter.format(new Date(unixSeconds * 1000));
}

export function formatDayClock(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return `${dayFormatter.format(date)} ${clockFormatter.format(date)}`;
}

export function formatHourRange(unixSeconds: number): string {
  const start = new Date(unixSeconds * 1000);
  const end = new Date((unixSeconds + 3600) * 1000);
  return `${dayFormatter.format(start)} · ${clockFormatter.format(start)}–${clockFormatter.format(end)} UTC`;
}

export function formatUpdated(iso: string | undefined): string {
  if (!iso) {
    return "Not updated yet";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
  }
  return `Updated ${clockFormatter.format(date)} UTC`;
}

export function formatCountdown(unixSeconds: number): string {
  const total = Math.max(0, Math.round(unixSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
