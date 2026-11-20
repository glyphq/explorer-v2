import { normalizeSocialUrl, SOCIAL_LABELS, SOCIAL_URL_MAX } from "@/lib/profiles/socials";
import type { SocialPlatform } from "@/lib/profiles/types";

export const DISPLAY_NAME_MAX = 48;
export const BIO_MAX = 280;
export const WEBSITE_MAX = 200;

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

export function socialValidationMessage(platform: SocialPlatform, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > SOCIAL_URL_MAX) {
    return `Keep the link under ${SOCIAL_URL_MAX} characters.`;
  }
  if (!normalizeSocialUrl(platform, trimmed)) {
    return `Enter a valid ${SOCIAL_LABELS[platform]} link.`;
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
