// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import {
  detectCall,
  detectResult,
  discordPayload,
  pushPayload,
  resultDiscordPayload,
  resultPushPayload,
} from "./bpp";

const HOUR = 1_795_424_400; // 2026-11-23 09:00:00 UTC
const NOW = HOUR + 1800;

function overview(
  hours: Array<{
    down: number;
    expected?: number | null;
    participants: number;
    status?: string;
    up: number;
  }>,
) {
  return {
    hypotheticalAccuracy: {
      agreementPercent: 60,
      correct: 5,
      hours: hours.map((hour, index) => ({
        expected: hour.expected ?? null,
        status: hour.status ?? "waiting",
        ...hour,
        hour: index,
        targetUnix: HOUR + index * 3600,
      })),
      incorrect: 5,
      minimumComputors: 400,
    },
  };
}

describe("detectCall", () => {
  test("returns a call once the hour reaches quorum and agreement", () => {
    const call = detectCall(123, overview([{ down: 50, participants: 500, up: 450 }]), NOW);

    expect(call).toEqual({
      closesAt: HOUR + 3600,
      down: 50,
      epoch: 123,
      hour: 0,
      said: "up",
      share: 90,
      targetUnix: HOUR,
      up: 450,
    });
  });

  test("ignores hours that have not reached the computor minimum", () => {
    expect(detectCall(123, overview([{ down: 20, participants: 399, up: 379 }]), NOW)).toBeNull();
  });

  test("ignores hours without enough agreement", () => {
    expect(detectCall(123, overview([{ down: 201, participants: 500, up: 299 }]), NOW)).toBeNull();
  });

  test("ignores split hours", () => {
    expect(detectCall(123, overview([{ down: 300, participants: 600, up: 300 }]), NOW)).toBeNull();
  });

  test("ignores closed hours", () => {
    expect(
      detectCall(123, overview([{ down: 50, participants: 500, up: 450 }]), HOUR + 3600),
    ).toBeNull();
  });
});

describe("detectResult", () => {
  const CLOSED = HOUR + 3600 + 60;

  test("reports a correct call with the current accuracy", () => {
    const result = detectResult(
      123,
      overview([
        {
          down: 50,
          expected: 1,
          participants: 500,
          status: "correct",
          up: 450,
        },
      ]),
      CLOSED,
    );

    expect(result).toEqual({
      accuracy: { correct: 5, incorrect: 5, percent: 50 },
      closesAt: HOUR + 3600,
      down: 50,
      epoch: 123,
      hour: 0,
      outcome: "correct",
      said: "up",
      share: 90,
      targetUnix: HOUR,
      up: 450,
      went: "up",
    });
  });

  test("reports a wrong call in the opposite direction", () => {
    const result = detectResult(
      123,
      overview([
        {
          down: 50,
          expected: 0,
          participants: 500,
          status: "incorrect",
          up: 450,
        },
      ]),
      CLOSED,
    );

    expect(result?.outcome).toBe("incorrect");
    expect(result?.went).toBe("down");
  });

  test("does not backfill results older than the notification window", () => {
    const result = detectResult(
      123,
      overview([
        {
          down: 50,
          expected: 1,
          participants: 500,
          status: "correct",
          up: 450,
        },
      ]),
      HOUR + 3600 + 7 * 3600,
    );

    expect(result).toBeNull();
  });

  test("waits for a scored status", () => {
    const result = detectResult(
      123,
      overview([
        {
          down: 50,
          expected: 1,
          participants: 500,
          status: "not_scored",
          up: 450,
        },
      ]),
      CLOSED,
    );

    expect(result).toBeNull();
  });
});

describe("notification payloads", () => {
  const call = detectCall(123, overview([{ down: 50, participants: 500, up: 450 }]), NOW);

  test("push payload points at the local page and carries a stable tag", () => {
    if (!call) {
      throw new Error("expected a call");
    }

    expect(pushPayload(call, "https://explorer.glyphq.org/")).toEqual({
      body: "450 up · 50 down · closes 10:00 UTC",
      tag: "bpp-123-0",
      timestamp: HOUR * 1000,
      title: "BPP-9000: Bitcoin UP · 90% agreement",
      url: "https://explorer.glyphq.org/bpp9000",
    });
  });

  test("discord payload suppresses mentions", () => {
    if (!call) {
      throw new Error("expected a call");
    }

    const payload = discordPayload(call, "https://explorer.glyphq.org");
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.content).toContain("Bitcoin UP · 90% agreement");
    expect(payload.content).toContain("https://explorer.glyphq.org/bpp9000");
  });

  test("result payload reports the verdict and factual accuracy", () => {
    const result = detectResult(
      123,
      overview([
        {
          down: 50,
          expected: 1,
          participants: 500,
          status: "correct",
          up: 450,
        },
      ]),
      HOUR + 3600 + 60,
    );
    if (!result) {
      throw new Error("expected a result");
    }

    expect(resultPushPayload(result, "https://explorer.glyphq.org")).toEqual({
      body: "BTC closed up · 90% agreement · 50% accuracy (5 right / 5 wrong)",
      tag: "bpp-result-123-0",
      timestamp: (HOUR + 3600) * 1000,
      title: "BPP-9000: Bitcoin UP call was RIGHT",
      url: "https://explorer.glyphq.org/bpp9000",
    });
    expect(resultDiscordPayload(result, "https://explorer.glyphq.org").content).toContain(
      "Bitcoin UP call was RIGHT",
    );
  });
});
