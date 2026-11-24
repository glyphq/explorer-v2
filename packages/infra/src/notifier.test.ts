// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { afterEach, describe, expect, test } from "bun:test";
// @ts-expect-error - provided by the Bun runtime; bun-types is not installed.
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";

import { runNotificationCycle, type NotifierEnv } from "./notifier";

const HOUR = 1_795_424_400;
const NOW = (HOUR + 1800) * 1000;
const MIGRATION = readFileSync(
  new URL("../migrations/0004_push_subscriptions.sql", import.meta.url).pathname,
  "utf8",
);

class SqliteStatement {
  private readonly db: Database;
  private readonly sql: string;
  private readonly params: unknown[];

  constructor(db: Database, sql: string, params: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params: unknown[]): SqliteStatement {
    return new SqliteStatement(this.db, this.sql, params);
  }

  first<T>(): Promise<T | null> {
    const row = this.db.query(this.sql).get(...(this.params as never[])) as T | undefined;
    return Promise.resolve(row ?? null);
  }

  all<T>(): Promise<{ results: T[] }> {
    const results = this.db.query(this.sql).all(...(this.params as never[])) as T[];
    return Promise.resolve({ results });
  }

  run(): Promise<void> {
    this.db.query(this.sql).run(...(this.params as never[]));
    return Promise.resolve();
  }
}

class SqliteD1 {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  prepare(sql: string): SqliteStatement {
    return new SqliteStatement(this.db, sql);
  }

  batch(statements: SqliteStatement[]): Promise<void> {
    for (const statement of statements) {
      this.db.run("BEGIN");
      try {
        statement.run();
        this.db.run("COMMIT");
      } catch (error) {
        this.db.run("ROLLBACK");
        throw error;
      }
    }
    return Promise.resolve();
  }
}

function database(): { db: Database; d1: D1Database } {
  const db = new Database(":memory:");
  db.exec(MIGRATION);
  return { db, d1: new SqliteD1(db) as unknown as D1Database };
}

async function vapidKeys(): Promise<{ privateKey: string; publicKey: string }> {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const publicKey = new Uint8Array(
    (await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer,
  );
  const jwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as JsonWebKey;
  if (!jwk.d) {
    throw new Error("missing private key");
  }
  return {
    privateKey: jwk.d,
    publicKey: Buffer.from(publicKey).toString("base64url"),
  };
}

async function clientKeys(): Promise<{ auth: string; p256dh: string }> {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const publicKey = new Uint8Array(
    (await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer,
  );
  return {
    auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url"),
    p256dh: Buffer.from(publicKey).toString("base64url"),
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("runNotificationCycle", () => {
  test("posts one consensus call to push subscribers and Discord", async () => {
    const { db, d1 } = database();
    const client = await clientKeys();
    db.query(
      "INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("https://push.example/sub", client.p256dh, client.auth, NOW, NOW);

    const keys = await vapidKeys();
    const requests: Array<{ body: string; url: string }> = [];
    globalThis.fetch = ((
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url = String(input);
      if (url.endsWith("/live/tick-info")) {
        return Promise.resolve(Response.json({ tickInfo: { epoch: 123 } }));
      }
      if (url.includes("/epochs/123/ant-colony-overview")) {
        return Promise.resolve(
          Response.json({
            hypotheticalAccuracy: {
              agreementPercent: 60,
              hours: [{ down: 50, hour: 9, participants: 500, targetUnix: HOUR, up: 450 }],
              minimumComputors: 400,
            },
          }),
        );
      }
      requests.push({ body: String(init?.body ?? ""), url });
      return Promise.resolve(
        new Response(null, { status: url.startsWith("https://push.example") ? 201 : 204 }),
      );
    }) as unknown as typeof fetch;

    const env: NotifierEnv = {
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/test",
      PROFILES_DB: d1,
      SITE_URL: "https://explorer.glyphq.org",
      VAPID_PRIVATE_KEY: keys.privateKey,
      VAPID_PUBLIC_KEY: keys.publicKey,
    };

    const cycle = await runNotificationCycle(env, NOW);
    expect(cycle.call.discord).toBe("sent");
    expect(cycle.call.push).toEqual({ failed: 0, sent: 1 });
    expect(cycle.call.call?.said).toBe("up");
    expect(cycle.result.result).toBeNull();

    const pushRequest = requests.find((request) => request.url.startsWith("https://push.example"));
    expect(pushRequest).toBeDefined();
    const discordRequest = requests.find((request) => request.url.includes("discord.com"));
    expect(JSON.parse(discordRequest?.body ?? "{}").content).toContain(
      "Bitcoin UP · 90% agreement",
    );

    const state = db
      .query("SELECT push_done, discord_done FROM bpp_notification_state WHERE id = 'bpp-call'")
      .get() as { discord_done: number; push_done: number };
    expect(state).toEqual({ discord_done: 1, push_done: 1 });

    const again = await runNotificationCycle(env, NOW);
    expect(again.call.push).toEqual({ failed: 0, sent: 0 });
    expect(again.call.discord).toBe("skipped");
  });

  test("announces a scored hour with verdict and factual accuracy", async () => {
    const { db, d1 } = database();
    const client = await clientKeys();
    db.query(
      "INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("https://push.example/result", client.p256dh, client.auth, NOW, NOW);

    const keys = await vapidKeys();
    const requests: Array<{ body: string; url: string }> = [];
    globalThis.fetch = ((
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url = String(input);
      if (url.endsWith("/live/tick-info")) {
        return Promise.resolve(Response.json({ tickInfo: { epoch: 123 } }));
      }
      if (url.includes("/epochs/123/ant-colony-overview")) {
        return Promise.resolve(
          Response.json({
            hypotheticalAccuracy: {
              agreementPercent: 60,
              correct: 5,
              hours: [
                {
                  down: 50,
                  expected: 1,
                  hour: 9,
                  participants: 500,
                  status: "correct",
                  targetUnix: HOUR,
                  up: 450,
                },
              ],
              incorrect: 5,
              minimumComputors: 400,
            },
          }),
        );
      }
      requests.push({ body: String(init?.body ?? ""), url });
      return Promise.resolve(
        new Response(null, { status: url.startsWith("https://push.example") ? 201 : 204 }),
      );
    }) as unknown as typeof fetch;

    const env: NotifierEnv = {
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/test",
      PROFILES_DB: d1,
      SITE_URL: "https://explorer.glyphq.org",
      VAPID_PRIVATE_KEY: keys.privateKey,
      VAPID_PUBLIC_KEY: keys.publicKey,
    };
    const closedAt = (HOUR + 3600 + 60) * 1000;

    const cycle = await runNotificationCycle(env, closedAt);
    expect(cycle.call.call).toBeNull();
    expect(cycle.result.result?.outcome).toBe("correct");
    expect(cycle.result.push).toEqual({ failed: 0, sent: 1 });
    expect(cycle.result.discord).toBe("sent");

    const discordRequest = requests.find((request) => request.url.includes("discord.com"));
    const content = JSON.parse(discordRequest?.body ?? "{}").content as string;
    expect(content).toContain("Bitcoin UP call was RIGHT");
    expect(content).toContain("BTC closed up · 90% agreement · 50% accuracy (5 right / 5 wrong)");

    const state = db
      .query("SELECT push_done, discord_done FROM bpp_notification_state WHERE id = 'bpp-result'")
      .get() as { discord_done: number; push_done: number };
    expect(state).toEqual({ discord_done: 1, push_done: 1 });

    const again = await runNotificationCycle(env, closedAt);
    expect(again.result.push).toEqual({ failed: 0, sent: 0 });
    expect(again.result.discord).toBe("skipped");
  });

  test("drops expired push endpoints without retrying the hour", async () => {
    const { db, d1 } = database();
    const client = await clientKeys();
    db.query(
      "INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("https://push.example/gone", client.p256dh, client.auth, NOW, NOW);

    const keys = await vapidKeys();
    globalThis.fetch = ((input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.endsWith("/live/tick-info")) {
        return Promise.resolve(Response.json({ tickInfo: { epoch: 123 } }));
      }
      if (url.includes("/epochs/123/ant-colony-overview")) {
        return Promise.resolve(
          Response.json({
            hypotheticalAccuracy: {
              agreementPercent: 60,
              hours: [{ down: 50, hour: 9, participants: 500, targetUnix: HOUR, up: 450 }],
              minimumComputors: 400,
            },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 410 }));
    }) as unknown as typeof fetch;

    const cycle = await runNotificationCycle(
      {
        PROFILES_DB: d1,
        SITE_URL: "https://explorer.glyphq.org",
        VAPID_PRIVATE_KEY: keys.privateKey,
        VAPID_PUBLIC_KEY: keys.publicKey,
      },
      NOW,
    );

    expect(cycle.call.push).toEqual({ failed: 0, sent: 0 });
    const remaining = db.query("SELECT count(*) AS count FROM push_subscriptions").get() as {
      count: number;
    };
    expect(remaining.count).toBe(0);
  });
});
