import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";
import "varlock/auto-load";

export default Alchemy.Stack(
  "explorer-v2",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const cache = yield* Cloudflare.KV.Namespace("Cache");
    const proposals = yield* Cloudflare.D1.Database("Proposals", {
      migrations: "./migrations",
      name: "explorer-v2-proposals",
      primaryLocationHint: "weur",
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
        PROPOSALS_DB: proposals,
      },
      main: "../../apps/web/.open-next/worker.js",
      // Rebuild shared workspace dependencies until Alchemy has a workspace-aware default memo.
      memo: false,
      name: "explorer-v2-web",
      outdir: ".open-next/assets",
    });

    return {
      web: webWorker.url,
    };
  }),
);
