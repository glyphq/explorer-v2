import {
  assertSameOrigin,
  createChallenge,
  getPublicProfile,
  noStoreHeaders,
  profileDomain,
  profileErrorResponse,
} from "@/lib/profiles/server";
import { ProfileError, parseChallengeAction, parseIdentity } from "@/lib/profiles/validation";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) {
      throw new ProfileError("invalid_request", "Request body must be a JSON object");
    }

    const identity = parseIdentity(body.identity);
    const action = parseChallengeAction(body.action);

    const profile = await getPublicProfile(identity);
    if (profile?.kind === "exchange") {
      throw new ProfileError(
        "exchange_identity",
        "Exchange identities cannot be claimed or revoked",
      );
    }

    const domain = profileDomain(request);
    const challenge = await createChallenge({ identity, action, domain });

    return Response.json({ challenge }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return profileErrorResponse(error, noStoreHeaders());
  }
}
