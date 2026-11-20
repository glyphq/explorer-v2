import type {
  ProfileApiError,
  ProfileChallengeAction,
  ProfileChallengeResponse,
  ProfileInput,
  ProfileSocials,
  PublicProfile,
} from "@/lib/profiles/types";
import { SOCIAL_PLATFORMS } from "@/lib/profiles/types";
import { normalizeSocialUrl } from "@/lib/profiles/socials";

/**
 * Client-side profile errors. `profile_unavailable` stays visible so callers
 * can tell an unavailable profile service apart from an identity that simply
 * has no profile (represented by a successful `null` result).
 */
export type ProfileErrorCode = ProfileApiError["code"] | "network" | "invalid_response" | "unknown";

export class ProfileRequestError extends Error {
  readonly code: ProfileErrorCode;
  readonly status: number;

  constructor(code: ProfileErrorCode, status = 0, cause?: unknown) {
    super(PROFILE_ERROR_MESSAGES[code] ?? PROFILE_ERROR_MESSAGES.unknown, {
      cause,
    });
    this.name = "ProfileRequestError";
    this.code = code;
    this.status = status;
  }
}

const PROFILE_ERROR_MESSAGES: Record<ProfileErrorCode, string> = {
  challenge_expired: "This signing request expired. Try again.",
  challenge_not_found: "This signing request is no longer valid. Try again.",
  challenge_used: "This signing request was already used. Try again.",
  content_not_allowed: "Remove offensive language from the display name or bio and try again.",
  exchange_identity:
    "This account is managed by a Qubic exchange. Exchange profiles are curated and cannot be edited here.",
  invalid_identity: "This account identity is not valid.",
  invalid_request: "Check the profile details and try again.",
  invalid_response: "The profile service returned an unexpected response. Try again.",
  invalid_signature: "The wallet signature could not be verified. Try again.",
  network: "Could not reach the profile service. Check your connection and try again.",
  origin_not_allowed: "Profile signing is not allowed from this address.",
  profile_unavailable: "Profiles are temporarily unavailable. Try again later.",
  rate_limited: "Too many attempts. Wait a moment and try again.",
  unknown: "Something went wrong. Try again.",
};

const KNOWN_CODES = new Set<ProfileApiError["code"]>([
  "challenge_expired",
  "challenge_not_found",
  "challenge_used",
  "content_not_allowed",
  "exchange_identity",
  "invalid_identity",
  "invalid_request",
  "invalid_signature",
  "origin_not_allowed",
  "profile_unavailable",
  "rate_limited",
]);

const SIGNATURE_PATTERN = /^[0-9a-f]{128}$/i;
const HEX_PREFIX_PATTERN = /^0x/i;

export function profileErrorMessage(error: unknown): string {
  if (error instanceof ProfileRequestError) {
    return PROFILE_ERROR_MESSAGES[error.code] ?? PROFILE_ERROR_MESSAGES.unknown;
  }
  return PROFILE_ERROR_MESSAGES.unknown;
}

export function isProfileUnavailable(error: unknown): boolean {
  return error instanceof ProfileRequestError && error.code === "profile_unavailable";
}

export function normalizeSignatureHex(value: string): string | null {
  const normalized = value.trim().replace(HEX_PREFIX_PATTERN, "").toLowerCase();
  return SIGNATURE_PATTERN.test(normalized) ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const SOCIAL_PLATFORM_SET = new Set<string>(SOCIAL_PLATFORMS);

function parseSocials(value: unknown): ProfileSocials {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new ProfileRequestError("invalid_response");
  }

  for (const key of Object.keys(value)) {
    if (!SOCIAL_PLATFORM_SET.has(key)) {
      throw new ProfileRequestError("invalid_response");
    }
  }

  const socials: ProfileSocials = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const candidate = value[platform];
    if (candidate === undefined) {
      continue;
    }
    if (typeof candidate !== "string") {
      throw new ProfileRequestError("invalid_response");
    }
    const normalized = normalizeSocialUrl(platform, candidate);
    if (!normalized) {
      throw new ProfileRequestError("invalid_response");
    }
    socials[platform] = normalized;
  }
  return socials;
}

function codeFromStatus(status: number): ProfileErrorCode {
  if (status === 400 || status === 422) {
    return "invalid_request";
  }
  if (status === 401 || status === 403) {
    return "origin_not_allowed";
  }
  if (status === 409) {
    return "exchange_identity";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 503) {
    return "profile_unavailable";
  }
  return "invalid_response";
}

function codeFromPayload(payload: unknown, status: number): ProfileErrorCode {
  if (isRecord(payload) && typeof payload.code === "string") {
    const code = payload.code as ProfileApiError["code"];
    if (KNOWN_CODES.has(code)) {
      return code;
    }
  }
  return codeFromStatus(status);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function requestJson(
  url: string,
  init: RequestInit,
): Promise<{ payload: unknown; status: number }> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ProfileRequestError("network", 0, cause);
  }

  const { status } = response;
  const payload = await readJson(response);

  if (!response.ok) {
    throw new ProfileRequestError(codeFromPayload(payload, status), status);
  }
  if (payload === undefined) {
    throw new ProfileRequestError("invalid_response", status);
  }
  return { payload, status };
}

function parseProfile(value: unknown): PublicProfile | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new ProfileRequestError("invalid_response");
  }
  const { bio, displayName, identity, kind, source, verification } = value;
  if (
    typeof identity !== "string" ||
    typeof displayName !== "string" ||
    typeof bio !== "string" ||
    (kind !== "wallet" && kind !== "exchange") ||
    (verification !== "wallet" && verification !== "curated") ||
    (source !== "wallet" && source !== "qubic-exchanges") ||
    typeof value.verifiedAt !== "number" ||
    typeof value.updatedAt !== "number" ||
    (value.website !== undefined && typeof value.website !== "string")
  ) {
    throw new ProfileRequestError("invalid_response");
  }
  return {
    bio,
    displayName,
    identity,
    kind,
    source,
    updatedAt: value.updatedAt,
    verification,
    verifiedAt: value.verifiedAt,
    website: typeof value.website === "string" ? value.website : undefined,
    socials: parseSocials(value.socials),
  };
}

function parseProfileResponse(payload: unknown, allowNull: boolean): PublicProfile | null {
  if (!(isRecord(payload) && "profile" in payload)) {
    throw new ProfileRequestError("invalid_response");
  }
  const profile = parseProfile(payload.profile);
  if (!allowNull && profile === null) {
    throw new ProfileRequestError("invalid_response");
  }
  return profile;
}

function parseChallenge(payload: unknown): ProfileChallengeResponse["challenge"] {
  if (!(isRecord(payload) && isRecord(payload.challenge))) {
    throw new ProfileRequestError("invalid_response");
  }
  const { challenge } = payload;
  if (
    typeof challenge.id !== "string" ||
    typeof challenge.identity !== "string" ||
    (challenge.action !== "claim" && challenge.action !== "revoke") ||
    typeof challenge.message !== "string" ||
    typeof challenge.expiresAt !== "number"
  ) {
    throw new ProfileRequestError("invalid_response");
  }
  return {
    action: challenge.action,
    expiresAt: challenge.expiresAt,
    id: challenge.id,
    identity: challenge.identity,
    message: challenge.message,
  };
}

function profilePath(identity: string): string {
  return `/api/profiles/${encodeURIComponent(identity)}`;
}

export async function fetchProfile(
  identity: string,
  signal?: AbortSignal,
): Promise<PublicProfile | null> {
  const { payload } = await requestJson(profilePath(identity), {
    headers: { Accept: "application/json" },
    method: "GET",
    signal,
  });
  return parseProfileResponse(payload, true);
}

export async function fetchExchangeProfiles(signal?: AbortSignal): Promise<PublicProfile[]> {
  const { payload } = await requestJson("/api/profiles/exchanges", {
    headers: { Accept: "application/json" },
    method: "GET",
    signal,
  });
  if (!(isRecord(payload) && Array.isArray(payload.profiles))) {
    throw new ProfileRequestError("invalid_response");
  }

  const profiles = payload.profiles.map((value) => parseProfile(value));
  if (profiles.some((profile) => profile === null || profile.kind !== "exchange")) {
    throw new ProfileRequestError("invalid_response");
  }
  return profiles as PublicProfile[];
}

export async function requestProfileChallenge(
  identity: string,
  action: ProfileChallengeAction,
): Promise<ProfileChallengeResponse["challenge"]> {
  const { payload } = await requestJson("/api/profiles/challenge", {
    body: JSON.stringify({ action, identity }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  return parseChallenge(payload);
}

export async function saveProfile(
  identity: string,
  input: {
    challengeId: string;
    signatureHex: string;
    profile: ProfileInput;
  },
): Promise<PublicProfile> {
  const { payload } = await requestJson(profilePath(identity), {
    body: JSON.stringify({
      challengeId: input.challengeId,
      profile: input.profile,
      signature: input.signatureHex,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const profile = parseProfileResponse(payload, false);
  if (profile === null) {
    throw new ProfileRequestError("invalid_response");
  }
  return profile;
}

export async function revokeProfile(
  identity: string,
  input: { challengeId: string; signatureHex: string },
): Promise<void> {
  await requestJson(profilePath(identity), {
    body: JSON.stringify({
      challengeId: input.challengeId,
      signature: input.signatureHex,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "DELETE",
  });
}
