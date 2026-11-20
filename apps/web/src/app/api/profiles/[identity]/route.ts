import {
  assertSameOrigin,
  claimProfile,
  getPublicProfile,
  noStoreHeaders,
  profileDomain,
  profileErrorResponse,
  revokeProfile,
} from "@/lib/profiles/server";
import { ProfileError, parseIdentity, parseProfileInput } from "@/lib/profiles/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ identity: string }> };

const PROFILE_CACHE_HEADERS = {
  "cache-control": "no-store",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) {
    throw new ProfileError("invalid_request", "Request body must be a JSON object");
  }
  return body;
}

function parseChallengeId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 100) {
    throw new ProfileError("invalid_request", "challengeId is required");
  }
  return value;
}

function parseSignature(value: unknown): string {
  if (typeof value !== "string") {
    throw new ProfileError("invalid_signature", "signature is required");
  }
  return value;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { identity } = await context.params;
    const parsedIdentity = parseIdentity(identity);
    const profile = await getPublicProfile(parsedIdentity);

    return Response.json({ profile }, { headers: PROFILE_CACHE_HEADERS });
  } catch (error) {
    return profileErrorResponse(error, noStoreHeaders());
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);

    const { identity } = await context.params;
    const parsedIdentity = parseIdentity(identity);
    const body = await readJsonObject(request);

    const challengeId = parseChallengeId(body.challengeId);
    const signature = parseSignature(body.signature);
    const profileInput = parseProfileInput(body.profile);

    const profile = await claimProfile({
      identity: parsedIdentity,
      challengeId,
      signature,
      domain: profileDomain(request),
      profile: profileInput,
    });

    return Response.json({ profile }, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return profileErrorResponse(error, noStoreHeaders());
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);

    const { identity } = await context.params;
    const parsedIdentity = parseIdentity(identity);
    const body = await readJsonObject(request);

    const challengeId = parseChallengeId(body.challengeId);
    const signature = parseSignature(body.signature);

    await revokeProfile({
      identity: parsedIdentity,
      challengeId,
      signature,
      domain: profileDomain(request),
    });

    return Response.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return profileErrorResponse(error, noStoreHeaders());
  }
}
