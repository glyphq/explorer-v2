import type {
  ProfileApiError,
  ProfileChallenge,
  ProfileChallengeAction,
  ProfileInput,
  ProfileKind,
  ProfileVerification,
  PublicProfile,
} from "./types";
import { isExchangeActive } from "../exchanges/brands";
import { verifyChallengeSignature } from "./signature";
import { parseStoredSocials } from "./socials";
import { ProfileError, type ProfileApiErrorCode } from "./validation";

export type {
  ProfileApiError,
  ProfileChallenge,
  ProfileChallengeAction,
  ProfileChallengeResponse,
  ProfileInput,
  ProfileKind,
  ProfileResponse,
  ProfileVerification,
  PublicProfile,
} from "./types";

export const CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const MAX_CHALLENGE_ATTEMPTS = 5;

/** Raised when the D1 binding is missing or unusable. */
export class ProfileUnavailableError extends Error {
  constructor(message = "Profile service is unavailable") {
    super(message);
    this.name = "ProfileUnavailableError";
  }
}

type ProfileRow = {
  identity: string;
  displayName: string;
  bio: string;
  website: string | null;
  socials: string | null;
  kind: ProfileKind;
  source: string;
  verifiedAt: number;
  createdAt: number;
  updatedAt: number;
};

type ChallengeRow = {
  id: string;
  identity: string;
  action: ProfileChallengeAction;
  message: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  attempts: number;
};

const PROFILE_COLUMNS = `
  identity,
  display_name AS displayName,
  bio,
  website,
  socials,
  kind,
  source,
  verified_at AS verifiedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const CHALLENGE_COLUMNS = `
  id,
  identity,
  action,
  message,
  domain,
  created_at AS createdAt,
  expires_at AS expiresAt,
  used_at AS usedAt,
  attempts
`;

function toPublicProfile(row: ProfileRow): PublicProfile {
  const verification: ProfileVerification = row.kind === "exchange" ? "curated" : "wallet";

  return {
    identity: row.identity,
    displayName: row.displayName,
    bio: row.bio,
    website: row.website ?? undefined,
    socials: parseStoredSocials(row.socials),
    kind: row.kind,
    verification,
    source: row.source === "qubic-exchanges" ? "qubic-exchanges" : "wallet",
    verifiedAt: row.verifiedAt,
    updatedAt: row.updatedAt,
  };
}

async function profilesDb(): Promise<D1Database> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const db = context.env.PROFILES_DB;
    if (!db) throw new ProfileUnavailableError();
    return db;
  } catch (error) {
    if (error instanceof ProfileUnavailableError) throw error;
    throw new ProfileUnavailableError();
  }
}

export async function getPublicProfile(identity: string): Promise<PublicProfile | null> {
  const db = await profilesDb();
  const row = await db
    .prepare(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE identity = ?`)
    .bind(identity)
    .first<ProfileRow>();

  return row ? toPublicProfile(row) : null;
}

/** Exchange profiles for venues that still list QUBIC. */
export async function listExchangeProfiles(): Promise<PublicProfile[]> {
  const db = await profilesDb();
  const result = await db
    .prepare(
      `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE kind = 'exchange' ORDER BY display_name COLLATE NOCASE ASC`,
    )
    .all<ProfileRow>();

  return (result.results ?? [])
    .map(toPublicProfile)
    .filter((profile) => isExchangeActive(profile.displayName));
}

export type CreateChallengeInput = {
  identity: string;
  action: ProfileChallengeAction;
  domain: string;
};

/**
 * Builds the canonical challenge message on one line. Qubic Wallet's
 * WalletConnect signer passes the message through a WebView JavaScript string
 * without escaping line breaks, so multi-line messages fail with errCode
 * -32015. Keep the message single-line and free of quotes and backslashes.
 */
export function buildChallengeMessage(input: {
  identity: string;
  action: ProfileChallengeAction;
  domain: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}): string {
  const actionLabel = input.action === "claim" ? "Claim profile" : "Revoke profile";

  return [
    "Glyph Explorer profile",
    `Identity: ${input.identity}`,
    `Action: ${actionLabel}`,
    `Domain: ${input.domain}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    "Signing this message proves you control this Qubic identity. It does not authorize a transaction.",
  ].join(" | ");
}

export async function createChallenge(input: CreateChallengeInput): Promise<ProfileChallenge> {
  const db = await profilesDb();
  const now = Date.now();
  const expiresAt = now + CHALLENGE_TTL_MS;
  const nonce = crypto.randomUUID();
  const message = buildChallengeMessage({
    identity: input.identity,
    action: input.action,
    domain: input.domain,
    nonce,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });

  await db.batch([
    db.prepare("DELETE FROM profile_challenges WHERE expires_at <= ?").bind(now),
    db
      .prepare(
        "DELETE FROM profile_challenges WHERE identity = ? AND action = ? AND used_at IS NULL",
      )
      .bind(input.identity, input.action),
    db
      .prepare(
        `INSERT INTO profile_challenges
          (id, identity, action, message, domain, created_at, expires_at, used_at, attempts)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
      )
      .bind(nonce, input.identity, input.action, message, input.domain, now, expiresAt),
  ]);

  return {
    id: nonce,
    identity: input.identity,
    action: input.action,
    message,
    expiresAt,
  };
}

type VerifiedChallenge = {
  challenge: ChallengeRow;
  claimedAt: number;
};

async function verifyChallenge(input: {
  identity: string;
  challengeId: string;
  signature: string;
  action: ProfileChallengeAction;
  domain: string;
}): Promise<VerifiedChallenge> {
  const db = await profilesDb();
  const challenge = await db
    .prepare(`SELECT ${CHALLENGE_COLUMNS} FROM profile_challenges WHERE id = ?`)
    .bind(input.challengeId)
    .first<ChallengeRow>();

  if (!challenge || challenge.identity !== input.identity) {
    throw new ProfileError("challenge_not_found", "Challenge not found");
  }
  if (challenge.action !== input.action) {
    throw new ProfileError("invalid_request", "Challenge action does not match this request");
  }
  if (challenge.usedAt !== null) {
    throw new ProfileError("challenge_used", "Challenge has already been used");
  }

  const now = Date.now();
  if (challenge.expiresAt <= now) {
    throw new ProfileError("challenge_expired", "Challenge has expired");
  }
  if (challenge.domain !== input.domain) {
    throw new ProfileError("invalid_request", "Challenge domain does not match this request");
  }
  if (challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
    throw new ProfileError("rate_limited", "Too many invalid signature attempts");
  }

  if (
    !verifyChallengeSignature(challenge.message, input.signature, input.identity, {
      allowQubicMessagePrefix: true,
    })
  ) {
    await db
      .prepare("UPDATE profile_challenges SET attempts = attempts + 1 WHERE id = ?")
      .bind(challenge.id)
      .run();
    throw new ProfileError("invalid_signature", "Invalid signature");
  }

  return { challenge, claimedAt: now };
}

async function markChallengeUsed(db: D1Database, id: string, usedAt: number): Promise<void> {
  const result = await db
    .prepare("UPDATE profile_challenges SET used_at = ? WHERE id = ? AND used_at IS NULL")
    .bind(usedAt, id)
    .run();

  if ((result.meta.changes ?? 0) !== 1) {
    throw new ProfileError("challenge_used", "Challenge has already been used");
  }
}

async function existingProfile(db: D1Database, identity: string): Promise<ProfileRow | null> {
  return db
    .prepare(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE identity = ?`)
    .bind(identity)
    .first<ProfileRow>();
}

export type ClaimProfileInput = {
  identity: string;
  challengeId: string;
  signature: string;
  domain: string;
  profile: ProfileInput;
};

/** Claims or updates a wallet profile after verifying ownership. */
export async function claimProfile(input: ClaimProfileInput): Promise<PublicProfile> {
  const db = await profilesDb();
  const { challenge, claimedAt } = await verifyChallenge({
    identity: input.identity,
    challengeId: input.challengeId,
    signature: input.signature,
    action: "claim",
    domain: input.domain,
  });

  const existing = await existingProfile(db, input.identity);
  if (existing?.kind === "exchange") {
    throw new ProfileError("exchange_identity", "Exchange profiles cannot be claimed");
  }
  if (existing && existing.updatedAt >= challenge.createdAt) {
    throw new ProfileError(
      "invalid_request",
      "Profile was updated more recently than this challenge",
    );
  }

  await markChallengeUsed(db, challenge.id, claimedAt);

  const website = input.profile.website ?? null;
  const socials = JSON.stringify(input.profile.socials ?? {});
  const result = await db
    .prepare(
      `INSERT INTO profiles
        (identity, display_name, bio, website, socials, kind, source, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'wallet', 'wallet', ?, ?, ?)
       ON CONFLICT (identity) DO UPDATE SET
         display_name = excluded.display_name,
         bio = excluded.bio,
         website = excluded.website,
         socials = excluded.socials,
         kind = excluded.kind,
         source = excluded.source,
         verified_at = excluded.verified_at,
         updated_at = excluded.updated_at
       WHERE profiles.kind = 'wallet' AND profiles.updated_at < ?`,
    )
    .bind(
      input.identity,
      input.profile.displayName,
      input.profile.bio,
      website,
      socials,
      claimedAt,
      claimedAt,
      claimedAt,
      challenge.createdAt,
    )
    .run();

  if ((result.meta.changes ?? 0) !== 1) {
    throw new ProfileError(
      "invalid_request",
      "Profile was updated more recently than this challenge",
    );
  }

  const profile = await existingProfile(db, input.identity);
  if (!profile) throw new ProfileUnavailableError();

  return toPublicProfile(profile);
}

export type RevokeProfileInput = {
  identity: string;
  challengeId: string;
  signature: string;
  domain: string;
};

/** Revokes a wallet profile after verifying ownership. Idempotent. */
export async function revokeProfile(input: RevokeProfileInput): Promise<void> {
  const db = await profilesDb();
  const { challenge, claimedAt } = await verifyChallenge({
    identity: input.identity,
    challengeId: input.challengeId,
    signature: input.signature,
    action: "revoke",
    domain: input.domain,
  });

  const existing = await existingProfile(db, input.identity);
  if (existing?.kind === "exchange") {
    throw new ProfileError("exchange_identity", "Exchange profiles cannot be revoked");
  }
  if (existing && existing.updatedAt > challenge.createdAt) {
    throw new ProfileError(
      "invalid_request",
      "Profile was updated more recently than this challenge",
    );
  }

  await markChallengeUsed(db, challenge.id, claimedAt);

  if (existing) {
    await db
      .prepare("DELETE FROM profiles WHERE identity = ? AND updated_at <= ?")
      .bind(input.identity, challenge.createdAt)
      .run();
  }
}

/** Enforces same-origin requests for mutations. A missing Origin header is allowed. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // Fall through to the configured site origin, if any.
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).origin);
    } catch {
      // Ignore a malformed configured URL rather than widening access.
    }
  }

  if (!allowed.has(origin)) {
    throw new ProfileError("origin_not_allowed", "Origin not allowed");
  }
}

/**
 * Domain bound into the signed challenge. Prefer the configured canonical site
 * URL so the message stays stable even when the request reaches the Worker
 * through an internal hostname.
 */
export function profileDomain(request: Request): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      return new URL(siteUrl).host;
    } catch {
      // Fall back to the request host below.
    }
  }
  return new URL(request.url).host;
}

/** Maps a profile error code to an HTTP status. */
export function profileErrorStatus(code: ProfileApiErrorCode): number {
  switch (code) {
    case "invalid_request":
    case "invalid_identity":
    case "invalid_signature":
    case "content_not_allowed":
      return 400;
    case "origin_not_allowed":
      return 403;
    case "challenge_not_found":
      return 404;
    case "challenge_used":
    case "exchange_identity":
      return 409;
    case "challenge_expired":
      return 410;
    case "rate_limited":
      return 429;
    case "profile_unavailable":
      return 503;
  }
}

/** Builds a safe JSON error response without leaking internals. */
export function profileErrorResponse(error: unknown, headers?: HeadersInit): Response {
  const baseHeaders = new Headers(headers);
  baseHeaders.set("content-type", "application/json; charset=utf-8");

  if (error instanceof ProfileError) {
    const body: ProfileApiError = { error: error.message, code: error.code };
    return new Response(JSON.stringify(body), {
      status: profileErrorStatus(error.code),
      headers: baseHeaders,
    });
  }

  const body: ProfileApiError = {
    error: "Profile service is unavailable",
    code: "profile_unavailable",
  };
  return new Response(JSON.stringify(body), {
    status: 503,
    headers: baseHeaders,
  });
}

export function noStoreHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("cache-control", "no-store");
  return headers;
}
