import { identityToPublicKey } from "@qubic.org/crypto";
import type { Identity } from "@qubic.org/crypto";

import type { ProfileApiError, ProfileChallengeAction, ProfileInput } from "./types";

export type ProfileApiErrorCode = ProfileApiError["code"];

export class ProfileError extends Error {
  readonly code: ProfileApiErrorCode;

  constructor(code: ProfileApiErrorCode, message: string) {
    super(message);
    this.name = "ProfileError";
    this.code = code;
  }
}

const IDENTITY_LENGTH = 60;
const MAX_DISPLAY_NAME_LENGTH = 48;
const MAX_BIO_LENGTH = 280;
const MAX_WEBSITE_LENGTH = 200;

const UPPERCASE_LETTERS = /^[A-Z]+$/;
const PROFILE_FIELDS = new Set(["displayName", "bio", "website"]);

export function hasControlCharacters(value: string, allowLineBreaks = false): boolean {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code === undefined) continue;
    if (allowLineBreaks && (code === 0x09 || code === 0x0a)) continue;
    const isControl =
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069);
    if (isControl) return true;
  }
  return false;
}

/** Validates a Qubic identity including its checksum. */
export function isValidIdentity(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length !== IDENTITY_LENGTH || !UPPERCASE_LETTERS.test(value)) return false;

  try {
    identityToPublicKey(value as Identity);
    return true;
  } catch {
    return false;
  }
}

export function parseIdentity(value: unknown): string {
  if (!isValidIdentity(value)) {
    throw new ProfileError("invalid_identity", "Invalid Qubic identity");
  }
  return value;
}

export function parseChallengeAction(value: unknown): ProfileChallengeAction {
  if (value === "claim" || value === "revoke") return value;
  throw new ProfileError("invalid_request", "Action must be claim or revoke");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ProfileError("invalid_request", `${field} must be a string`);
  }
  return value;
}

function parseDisplayName(value: unknown): string {
  const displayName = requireString(value, "displayName").trim();
  if (hasControlCharacters(displayName)) {
    throw new ProfileError("invalid_request", "displayName contains control characters");
  }
  if (displayName.length < 1 || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new ProfileError(
      "invalid_request",
      `displayName must be 1-${MAX_DISPLAY_NAME_LENGTH} characters`,
    );
  }
  return displayName;
}

function parseBio(value: unknown): string {
  if (value === undefined || value === null) return "";
  const bio = requireString(value, "bio").replace(/\r\n?/g, "\n").trim();
  if (hasControlCharacters(bio, true)) {
    throw new ProfileError("invalid_request", "bio contains control characters");
  }
  if (bio.length > MAX_BIO_LENGTH) {
    throw new ProfileError("invalid_request", `bio must be at most ${MAX_BIO_LENGTH} characters`);
  }
  return bio;
}

function parseWebsite(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const website = requireString(value, "website").trim();
  if (hasControlCharacters(website)) {
    throw new ProfileError("invalid_request", "website contains control characters");
  }
  if (website.length > MAX_WEBSITE_LENGTH) {
    throw new ProfileError(
      "invalid_request",
      `website must be at most ${MAX_WEBSITE_LENGTH} characters`,
    );
  }

  let url: URL;
  try {
    url = new URL(website);
  } catch {
    throw new ProfileError("invalid_request", "website must be a valid URL");
  }

  if (url.protocol !== "https:") {
    throw new ProfileError("invalid_request", "website must use https");
  }
  if (url.username !== "" || url.password !== "") {
    throw new ProfileError("invalid_request", "website must not contain credentials");
  }
  if (url.hostname === "") {
    throw new ProfileError("invalid_request", "website must include a hostname");
  }

  const canonical = url.toString();
  if (canonical.length > MAX_WEBSITE_LENGTH) {
    throw new ProfileError(
      "invalid_request",
      `website must be at most ${MAX_WEBSITE_LENGTH} characters`,
    );
  }
  return canonical;
}

/** Strictly parses untrusted profile input, rejecting unknown fields. */
export function parseProfileInput(value: unknown): ProfileInput {
  if (!isRecord(value)) {
    throw new ProfileError("invalid_request", "profile must be an object");
  }

  for (const key of Object.keys(value)) {
    if (!PROFILE_FIELDS.has(key)) {
      throw new ProfileError("invalid_request", `Unknown profile field: ${key}`);
    }
  }

  return {
    displayName: parseDisplayName(value.displayName),
    bio: parseBio(value.bio),
    website: parseWebsite(value.website),
  };
}

export function isProfileApiErrorCode(value: string): value is ProfileApiErrorCode {
  return (
    value === "invalid_request" ||
    value === "invalid_identity" ||
    value === "invalid_signature" ||
    value === "challenge_expired" ||
    value === "challenge_used" ||
    value === "challenge_not_found" ||
    value === "exchange_identity" ||
    value === "profile_unavailable" ||
    value === "origin_not_allowed" ||
    value === "rate_limited"
  );
}
