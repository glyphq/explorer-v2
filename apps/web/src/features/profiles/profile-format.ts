export const DISPLAY_NAME_MAX = 48;
export const BIO_MAX = 280;
export const WEBSITE_MAX = 200;

const profileDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

/**
 * Format a profile timestamp in UTC so server and client render the same text.
 * Accepts either seconds or milliseconds.
 */
export function formatProfileDate(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined || !Number.isFinite(timestamp)) {
    return "Not available";
  }
  const milliseconds = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return profileDateFormatter.format(date);
}

export function profileWebsiteHref(website: string | undefined | null): string | null {
  if (!website) {
    return null;
  }
  try {
    const url = new URL(website.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function websiteValidationMessage(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > WEBSITE_MAX) {
    return `Keep the link under ${WEBSITE_MAX} characters.`;
  }
  const href = profileWebsiteHref(trimmed);
  if (!href) {
    return "Use a full https:// link.";
  }
  const url = new URL(href);
  if (url.username || url.password) {
    return "Links cannot include credentials.";
  }
  return null;
}

/** Human label for a website: host plus path, without the protocol. */
export function formatWebsiteLabel(website: string, maxLength = 48): string {
  const href = profileWebsiteHref(website);
  if (!href) {
    return website;
  }
  const url = new URL(href);
  const path = url.pathname === "/" ? "" : url.pathname;
  const label = `${url.host}${path}`;
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

export function isChallengeExpired(expiresAt: number): boolean {
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  const milliseconds = expiresAt < 10_000_000_000 ? expiresAt * 1000 : expiresAt;
  return milliseconds <= Date.now();
}
