import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

import {
  type BppOverview,
  type CallAnnouncement,
  detectCall,
  detectResult,
  discordPayload,
  type PushPayload,
  pushPayload,
  type ResultAnnouncement,
  resultDiscordPayload,
  resultPushPayload,
} from "./bpp";

const ANN_API = "https://annexplorer.jetskipool.ai/api/v1";
const CALL_STATE_ID = "bpp-call";
const RESULT_STATE_ID = "bpp-result";
const PUSH_BATCH_SIZE = 10;
const FETCH_TIMEOUT_MS = 12_000;

export interface NotifierEnv {
  DISCORD_WEBHOOK_URL?: string;
  PROFILES_DB: D1Database;
  SITE_URL?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_SUBJECT?: string;
}

interface TickResponse {
  tickInfo?: {
    epoch?: number;
  };
}

interface StoredSubscription extends PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface StateRow {
  discord_done: number;
  push_done: number;
  target_unix: number;
}

interface StateSeed {
  epoch: number;
  hour: number;
  said: string;
  targetUnix: number;
}

interface NotificationMessage {
  discord: string;
  key: string;
  push: PushPayload;
  seed: StateSeed;
}

type PushOutcome = "sent" | "gone" | "failed";

interface PushResult {
  endpoint: string;
  outcome: PushOutcome;
}

interface PushDelivery {
  failed: number;
  sent: number;
}

export interface NotificationOutcome {
  discord: "sent" | "failed" | "skipped";
  push: PushDelivery;
  skipped: boolean;
}

export interface CycleResult {
  call: NotificationOutcome & { call: CallAnnouncement | null };
  result: NotificationOutcome & { result: ResultAnnouncement | null };
}

const EMPTY_OUTCOME: NotificationOutcome = {
  discord: "skipped",
  push: { failed: 0, sent: 0 },
  skipped: true,
};

function vapidKeys(env: NotifierEnv): VapidKeys | null {
  if (!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)) {
    return null;
  }
  return {
    privateKey: env.VAPID_PRIVATE_KEY,
    publicKey: env.VAPID_PUBLIC_KEY,
    subject: env.VAPID_SUBJECT || "https://explorer.glyphq.org",
  };
}

async function readJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

async function readOverview(): Promise<{ epoch: number; overview: BppOverview } | null> {
  const tick = await readJson<TickResponse>(`${ANN_API}/live/tick-info`);
  const epoch = tick?.tickInfo?.epoch;
  if (!epoch) {
    return null;
  }

  const overview = await readJson<BppOverview>(
    `${ANN_API}/epochs/${epoch}/ant-colony-overview?limit=200&offset=0`,
  );
  return overview ? { epoch, overview } : null;
}

async function readState(
  db: D1Database,
  message: NotificationMessage,
  now: number,
): Promise<{ discordDone: boolean; pushDone: boolean } | null> {
  const row = await db
    .prepare("SELECT target_unix, push_done, discord_done FROM bpp_notification_state WHERE id = ?")
    .bind(message.key)
    .first<StateRow>();

  if (row && row.target_unix > message.seed.targetUnix) {
    return null;
  }
  if (row && row.target_unix === message.seed.targetUnix) {
    return { discordDone: row.discord_done === 1, pushDone: row.push_done === 1 };
  }

  await db
    .prepare(
      `INSERT INTO bpp_notification_state
        (id, epoch, hour, said, target_unix, push_done, discord_done, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)
       ON CONFLICT (id) DO UPDATE SET
         epoch = excluded.epoch,
         hour = excluded.hour,
         said = excluded.said,
         target_unix = excluded.target_unix,
         push_done = 0,
         discord_done = 0,
         updated_at = excluded.updated_at`,
    )
    .bind(
      message.key,
      message.seed.epoch,
      message.seed.hour,
      message.seed.said,
      message.seed.targetUnix,
      now,
    )
    .run();

  return { discordDone: false, pushDone: false };
}

async function markChannel(
  db: D1Database,
  message: NotificationMessage,
  channel: "discord_done" | "push_done",
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE bpp_notification_state
       SET ${channel} = 1, updated_at = ?
       WHERE id = ? AND target_unix = ?`,
    )
    .bind(now, message.key, message.seed.targetUnix)
    .run();
}

async function readSubscriptions(db: D1Database): Promise<StoredSubscription[]> {
  const result = await db
    .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions")
    .all<StoredSubscription>();
  return result.results ?? [];
}

async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload,
  vapid: VapidKeys,
): Promise<PushOutcome> {
  try {
    const request = await buildPushPayload(
      {
        data: payload,
        options: { topic: payload.tag, ttl: 3600, urgency: "normal" },
      },
      {
        endpoint: subscription.endpoint,
        expirationTime: null,
        keys: { auth: subscription.auth, p256dh: subscription.p256dh },
      },
      vapid,
    );
    const response = await fetch(subscription.endpoint, request);
    if (response.ok) {
      return "sent";
    }
    return response.status === 404 || response.status === 410 ? "gone" : "failed";
  } catch (error) {
    console.error("push delivery failed", error);
    return "failed";
  }
}

async function recordPushResults(
  db: D1Database,
  results: PushResult[],
  now: number,
): Promise<void> {
  const statements = results.map((result) => {
    if (result.outcome === "gone") {
      return db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(result.endpoint);
    }
    if (result.outcome === "sent") {
      return db
        .prepare(
          "UPDATE push_subscriptions SET last_success_at = ?, failure_count = 0 WHERE endpoint = ?",
        )
        .bind(now, result.endpoint);
    }
    return db
      .prepare("UPDATE push_subscriptions SET failure_count = failure_count + 1 WHERE endpoint = ?")
      .bind(result.endpoint);
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function deliverPush(
  db: D1Database,
  payload: PushPayload,
  vapid: VapidKeys | null,
  now: number,
): Promise<PushDelivery & { shouldMark: boolean }> {
  if (!vapid) {
    return { failed: 0, sent: 0, shouldMark: true };
  }

  const subscriptions = await readSubscriptions(db);
  if (subscriptions.length === 0) {
    return { failed: 0, sent: 0, shouldMark: true };
  }

  const results: PushResult[] = [];
  for (let index = 0; index < subscriptions.length; index += PUSH_BATCH_SIZE) {
    const batch = subscriptions.slice(index, index + PUSH_BATCH_SIZE);
    // Batches are sequential on purpose: cap fan-out to push services.
    // biome-ignore lint/performance/noAwaitInLoops: bounded push-service concurrency.
    const settled = await Promise.all(
      batch.map(async (subscription) => ({
        endpoint: subscription.endpoint,
        outcome: await sendPush(subscription, payload, vapid),
      })),
    );
    results.push(...settled);
  }

  await recordPushResults(db, results, now);

  const sent = results.filter((result) => result.outcome === "sent").length;
  const failed = results.filter((result) => result.outcome === "failed").length;
  return { failed, sent, shouldMark: failed === 0 || sent > 0 };
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

async function sendDiscord(webhook: string, content: string): Promise<boolean> {
  const send = (): Promise<Response> =>
    fetch(webhook, {
      body: JSON.stringify({ allowed_mentions: { parse: [] }, content }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

  try {
    let response = await send();
    if (response.status === 429) {
      const body = (await response.json()) as { retry_after?: number };
      const waitMs = Math.min(Math.max(body.retry_after ?? 1, 0), 5) * 1000;
      await delay(waitMs);
      response = await send();
    }
    if (!response.ok) {
      console.error("discord webhook responded", response.status);
    }
    return response.ok;
  } catch (error) {
    console.error("discord webhook failed", error);
    return false;
  }
}

async function deliverMessage(
  env: NotifierEnv,
  message: NotificationMessage,
  now: number,
): Promise<NotificationOutcome> {
  const state = await readState(env.PROFILES_DB, message, now);
  if (!state) {
    return { ...EMPTY_OUTCOME, skipped: true };
  }

  let push = { failed: 0, sent: 0 };
  let pushDone = state.pushDone;
  if (!pushDone) {
    const delivery = await deliverPush(env.PROFILES_DB, message.push, vapidKeys(env), now);
    push = { failed: delivery.failed, sent: delivery.sent };
    if (delivery.shouldMark) {
      await markChannel(env.PROFILES_DB, message, "push_done", now);
      pushDone = true;
    }
  }

  let discord: NotificationOutcome["discord"] = "skipped";
  let discordDone = state.discordDone;
  if (!discordDone) {
    if (env.DISCORD_WEBHOOK_URL) {
      discord = (await sendDiscord(env.DISCORD_WEBHOOK_URL, message.discord)) ? "sent" : "failed";
      if (discord === "sent") {
        await markChannel(env.PROFILES_DB, message, "discord_done", now);
        discordDone = true;
      }
    } else {
      await markChannel(env.PROFILES_DB, message, "discord_done", now);
      discordDone = true;
    }
  }

  return {
    discord,
    push,
    skipped: pushDone && discordDone,
  };
}

function callMessage(announcement: CallAnnouncement, env: NotifierEnv): NotificationMessage {
  return {
    discord: discordPayload(announcement, env.SITE_URL).content,
    key: CALL_STATE_ID,
    push: pushPayload(announcement, env.SITE_URL),
    seed: {
      epoch: announcement.epoch,
      hour: announcement.hour,
      said: announcement.said,
      targetUnix: announcement.targetUnix,
    },
  };
}

function resultMessage(announcement: ResultAnnouncement, env: NotifierEnv): NotificationMessage {
  return {
    discord: resultDiscordPayload(announcement, env.SITE_URL).content,
    key: RESULT_STATE_ID,
    push: resultPushPayload(announcement, env.SITE_URL),
    seed: {
      epoch: announcement.epoch,
      hour: announcement.hour,
      said: announcement.said,
      targetUnix: announcement.targetUnix,
    },
  };
}

export async function runNotificationCycle(
  env: NotifierEnv,
  now: number = Date.now(),
): Promise<CycleResult> {
  const context = await readOverview();
  if (!context) {
    return { call: { ...EMPTY_OUTCOME, call: null }, result: { ...EMPTY_OUTCOME, result: null } };
  }

  const nowSeconds = Math.floor(now / 1000);
  const call = detectCall(context.epoch, context.overview, nowSeconds);
  const result = detectResult(context.epoch, context.overview, nowSeconds);

  const resultOutcome = result
    ? await deliverMessage(env, resultMessage(result, env), now)
    : { ...EMPTY_OUTCOME, skipped: true };
  const callOutcome = call
    ? await deliverMessage(env, callMessage(call, env), now)
    : { ...EMPTY_OUTCOME, skipped: true };

  return {
    call: { ...callOutcome, call },
    result: { ...resultOutcome, result },
  };
}

const worker: ExportedHandler<NotifierEnv> = {
  fetch(_request, env) {
    return Response.json({
      configured: {
        discord: Boolean(env.DISCORD_WEBHOOK_URL),
        push: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      },
      ok: true,
    });
  },

  async scheduled(controller, env) {
    const now = controller.scheduledTime > 0 ? controller.scheduledTime : Date.now();
    const cycle = await runNotificationCycle(env, now);
    console.log("bpp notifier", {
      call: cycle.call.call ? { discord: cycle.call.discord, push: cycle.call.push } : null,
      result: cycle.result.result
        ? { discord: cycle.result.discord, push: cycle.result.push }
        : null,
    });
  },
};

export default worker;
