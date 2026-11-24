import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import "varlock/auto-load";

export default Alchemy.Stack(
  "explorer-v2",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const cache = yield* Cloudflare.KV.Namespace("Cache");

    const profilesDb = yield* Cloudflare.D1.Database("Profiles", {
      name: "explorer-v2-profiles",
      primaryLocationHint: "weur",
      migrations: "./migrations",
    });

    const webWorker = yield* Cloudflare.Website.StaticSite("web", {
      assets: {
        runWorkerFirst: false,
      },
      bundle: true,
      command: "bun run build:cloudflare",
      compatibility: {
        date: "2026-11-19",
        flags: ["nodejs_compat", "global_fetch_strictly_public"],
      },
      cwd: "../../apps/web",
      dev: {
        command: "bun run dev:bare",
        url: "http://localhost:3001",
      },
      domain: {
        name: "explorer.glyphq.org",
      },
      env: {
        IMAGES: Cloudflare.Images.Images(),
        NEXT_INC_CACHE_KV: cache,
        NEXT_TAG_CACHE_KV: cache,
        PROPOSALS_KV: cache,
        PROFILES_DB: profilesDb,
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? "",
      },
      main: "../../apps/web/.open-next/worker.js",
      // Rebuild shared workspace dependencies until Alchemy has a workspace-aware default memo.
      memo: false,
      name: "explorer-v2-web",
      outdir: ".open-next/assets",
    });

    const notifier = yield* Cloudflare.Worker("Notifier", {
      name: "explorer-v2-notifier",
      main: "./src/notifier.ts",
      compatibility: {
        date: "2026-11-19",
        flags: ["nodejs_compat"],
      },
      crons: ["* * * * *"],
      env: {
        DISCORD_WEBHOOK_URL: Redacted.make(process.env.DISCORD_WEBHOOK_URL ?? ""),
        PROFILES_DB: profilesDb,
        SITE_URL: "https://explorer.glyphq.org",
        VAPID_PRIVATE_KEY: Redacted.make(process.env.VAPID_PRIVATE_KEY ?? ""),
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? "",
        VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? "https://explorer.glyphq.org",
      },
      workersDev: false,
    });

    return {
      notifier: notifier.workerName,
      web: webWorker.url,
    };
  }),
);
