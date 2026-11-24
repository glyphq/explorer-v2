// @ts-expect-error - provided by the Bun runtime; bun-types is not installed.
import { Database } from "bun:sqlite";
// @ts-expect-error - provided by the Bun runtime; bun-types is not installed.
import { Glob } from "bun";

import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

import {
  type CallAnnouncement,
  pushPayload,
  type ResultAnnouncement,
  resultPushPayload,
} from "../src/bpp";

interface StoredSubscription extends PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const root = new URL("../../../", import.meta.url);
const glob = new Glob("apps/web/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite");
const databases = [...glob.scanSync({ absolute: true, cwd: root.pathname })];
if (databases.length === 0) {
  throw new Error("No local D1 database found. Start the web app once to create it.");
}

const database = new Database(databases.at(-1) ?? "");
const rows = database
  .query("SELECT endpoint, p256dh, auth FROM push_subscriptions")
  .all() as StoredSubscription[];
database.close();

if (rows.length === 0) {
  console.log("No local push subscriptions. Enable notifications in the browser first.");
  process.exit(0);
}

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
if (!(publicKey && privateKey)) {
  throw new Error("Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY before sending.");
}

const now = Math.floor(Date.now() / 1000);
const targetUnix = Math.floor(now / 3600) * 3600;
const announcement: CallAnnouncement = {
  closesAt: targetUnix + 3600,
  down: 110,
  epoch: 0,
  hour: new Date(targetUnix * 1000).getUTCHours(),
  said: "up",
  share: 78,
  targetUnix,
  up: 390,
};

const result: ResultAnnouncement = {
  accuracy: { correct: 5, incorrect: 5, percent: 50 },
  closesAt: announcement.closesAt,
  down: announcement.down,
  epoch: 0,
  hour: announcement.hour,
  outcome: "correct",
  said: "up",
  share: 78,
  targetUnix,
  up: announcement.up,
  went: "up",
};
const site = process.env.SITE_URL ?? "http://localhost:3001";
const payload =
  process.argv[2] === "result" ? resultPushPayload(result, site) : pushPayload(announcement, site);
const vapid = {
  privateKey,
  publicKey,
  subject: process.env.VAPID_SUBJECT ?? "https://explorer.glyphq.org",
};

const lines = await Promise.all(
  rows.map(async (row) => {
    const request = await buildPushPayload(
      {
        data: { ...payload, tag: `bpp-test-${Date.now()}` },
        options: { ttl: 60, urgency: "high" },
      },
      {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: { auth: row.auth, p256dh: row.p256dh },
      },
      vapid,
    );
    const response = await fetch(row.endpoint, request);
    return `${response.status} ${row.endpoint.slice(0, 48)}…`;
  }),
);
for (const line of lines) {
  console.log(line);
}
