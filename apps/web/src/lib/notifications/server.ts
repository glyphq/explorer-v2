const MAX_ENDPOINT_LENGTH = 2048;
const MAX_P256DH_LENGTH = 256;
const MAX_AUTH_LENGTH = 64;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

export class PushError extends Error {
  readonly status: number;

  constructor(status: number, message: string, cause?: unknown) {
    super(message);
    this.name = "PushError";
    this.status = status;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

async function cloudflareEnv(): Promise<CloudflareEnv> {
  // OpenNext's binding bridge only exists in the Worker/Next dev runtime, so
  // keep the import lazy and let a missing runtime surface as unavailable.
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const context = await getCloudflareContext({ async: true });
  return context.env;
}

/** Local next dev reads .env.local; deployed Workers expose the secret on env. */
async function vapidPublicKey(): Promise<string | null> {
  const env = await cloudflareEnv();
  const key = env.VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
}

async function pushDb(): Promise<D1Database> {
  const db = (await cloudflareEnv()).PROFILES_DB;
  if (!db) {
    throw new PushError(503, "Push notifications are unavailable");
  }
  return db;
}

export async function getPushConfig(): Promise<PushConfig> {
  const publicKey = await vapidPublicKey();
  return { enabled: publicKey !== null, publicKey };
}

function parseEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_ENDPOINT_LENGTH) {
    throw new PushError(400, "Invalid push endpoint");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    // biome-ignore lint/style/useErrorCause: PushError stores the original cause.
    throw new PushError(400, "Invalid push endpoint", error);
  }
  if (url.protocol !== "https:") {
    throw new PushError(400, "Push endpoint must use HTTPS");
  }
  return value;
}

function parseKey(value: unknown, field: "p256dh" | "auth"): string {
  const max = field === "p256dh" ? MAX_P256DH_LENGTH : MAX_AUTH_LENGTH;
  if (typeof value !== "string") {
    throw new PushError(400, `Invalid push key: ${field}`);
  }
  if (value.length === 0 || value.length > max || !BASE64URL.test(value)) {
    throw new PushError(400, `Invalid push key: ${field}`);
  }
  return value;
}

export function parsePushSubscription(value: unknown): PushSubscriptionInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PushError(400, "Invalid push subscription");
  }

  const record = value as Record<string, unknown>;
  const { keys } = record;
  if (typeof keys !== "object" || keys === null || Array.isArray(keys)) {
    throw new PushError(400, "Invalid push subscription");
  }

  const keyRecord = keys as Record<string, unknown>;
  return {
    endpoint: parseEndpoint(record.endpoint),
    keys: {
      auth: parseKey(keyRecord.auth, "auth"),
      p256dh: parseKey(keyRecord.p256dh, "p256dh"),
    },
  };
}

export async function savePushSubscription(subscription: PushSubscriptionInput): Promise<void> {
  const db = await pushDb();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         updated_at = excluded.updated_at,
         failure_count = 0`,
    )
    .bind(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, now, now)
    .run();
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = await pushDb();
  await db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
}

function response(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
    status,
  });
}

/** Push subscribe calls are same-origin browser requests, never cross-site forms. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  try {
    if (new URL(origin).host !== new URL(request.url).host) {
      throw new PushError(403, "Cross-origin request rejected");
    }
  } catch (error) {
    if (error instanceof PushError) {
      throw error;
    }
    // biome-ignore lint/style/useErrorCause: PushError stores the original cause.
    throw new PushError(403, "Cross-origin request rejected", error);
  }
}

export function pushErrorResponse(error: unknown): Response {
  if (error instanceof PushError) {
    return response({ error: error.message }, error.status);
  }
  return response({ error: "Push notifications are unavailable" }, 503);
}

export { response as pushJsonResponse };
