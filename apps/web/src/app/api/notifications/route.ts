import {
  assertSameOrigin,
  deletePushSubscription,
  getPushConfig,
  parsePushSubscription,
  pushErrorResponse,
  pushJsonResponse,
  savePushSubscription,
} from "@/lib/notifications/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return pushJsonResponse(await getPushConfig());
  } catch (error) {
    return pushErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const subscription = parsePushSubscription(await request.json());
    await savePushSubscription(subscription);
    return pushJsonResponse({ subscribed: true });
  } catch (error) {
    return pushErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json()) as { endpoint?: unknown };
    if (typeof body.endpoint !== "string") {
      return pushJsonResponse({ error: "Invalid push endpoint" }, 400);
    }
    await deletePushSubscription(body.endpoint);
    return pushJsonResponse({ subscribed: false });
  } catch (error) {
    return pushErrorResponse(error);
  }
}
