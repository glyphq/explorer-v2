import type { ProfileSocials, SocialPlatform } from "./types";
import { SOCIAL_PLATFORMS } from "./types";

export const SOCIAL_URL_MAX = 200;

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  discord: "Discord",
  github: "GitHub",
  telegram: "Telegram",
  x: "X",
};

const SOCIAL_HOSTS: Record<SocialPlatform, readonly string[]> = {
  discord: ["discord.com", "discord.gg", "discordapp.com"],
  github: ["github.com"],
  telegram: ["t.me", "telegram.me"],
  x: ["mobile.twitter.com", "mobile.x.com", "twitter.com", "x.com"],
};

const SOCIAL_HANDLE_BASES: Partial<Record<SocialPlatform, string>> = {
  discord: "https://discord.com/users/",
  github: "https://github.com/",
  telegram: "https://t.me/",
  x: "https://x.com/",
};

const SOCIAL_HANDLE_PATTERNS: Partial<Record<SocialPlatform, RegExp>> = {
  discord: /^[a-z0-9._]{2,32}$/i,
  github: /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i,
  telegram: /^[a-z0-9_]{1,32}$/i,
  x: /^[a-z0-9_]{1,15}$/i,
};

function looksLikeSocialUrl(platform: SocialPlatform, value: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.includes("/") || /^www\./i.test(value)) {
    return true;
  }
  const lower = value.toLowerCase();
  return SOCIAL_HOSTS[platform].some((host) => lower === host || lower.endsWith(`.${host}`));
}

/**
 * Normalizes a social profile link into a canonical HTTPS URL. Handles without
 * a scheme are accepted, tracking queries and fragments are dropped, and only
 * the hosts owned by the selected platform are allowed.
 */
export function normalizeSocialUrl(platform: SocialPlatform, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > SOCIAL_URL_MAX) {
    return null;
  }

  const handleBase = SOCIAL_HANDLE_BASES[platform];
  const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  let candidate = trimmed;
  if (handleBase && !looksLikeSocialUrl(platform, trimmed)) {
    if (!SOCIAL_HANDLE_PATTERNS[platform]?.test(handle)) {
      return null;
    }
    candidate = `${handleBase}${handle}`;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!SOCIAL_HOSTS[platform].includes(host)) {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (path.length < 2) {
    return null;
  }

  let canonicalHost = host;
  if (platform === "x") {
    canonicalHost = "x.com";
  } else if (platform === "telegram") {
    canonicalHost = "t.me";
  } else if (platform === "github") {
    canonicalHost = "github.com";
  } else if (platform === "discord" && host === "discordapp.com") {
    canonicalHost = "discord.com";
  }

  return `https://${canonicalHost}${path}`;
}

/** Reads stored social JSON, ignoring unknown or invalid entries. */
export function parseStoredSocials(value: string | null): ProfileSocials {
  if (!value) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const socials: ProfileSocials = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const candidate = (parsed as Record<string, unknown>)[platform];
    if (typeof candidate !== "string") {
      continue;
    }
    const normalized = normalizeSocialUrl(platform, candidate);
    if (normalized) {
      socials[platform] = normalized;
    }
  }
  return socials;
}
