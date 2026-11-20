// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, it } from "bun:test";

import { getEpochProgress } from "./epoch";

function at(iso: string) {
  return new Date(iso);
}

describe("epoch progress", () => {
  it("starts a new epoch on Wednesday at 12:00 PM UTC", () => {
    const progress = getEpochProgress(at("2026-11-18T12:00:00.000Z"));

    expect(progress.start.toISOString()).toBe("2026-11-18T12:00:00.000Z");
    expect(progress.end.toISOString()).toBe("2026-11-25T12:00:00.000Z");
    expect(progress.progress).toBe(0);
  });

  it("keeps the previous epoch open before Wednesday noon", () => {
    const progress = getEpochProgress(at("2026-11-18T11:59:59.000Z"));

    expect(progress.start.toISOString()).toBe("2026-11-11T12:00:00.000Z");
    expect(progress.end.toISOString()).toBe("2026-11-18T12:00:00.000Z");
  });

  it("reports half of the weekly window at the midpoint", () => {
    const progress = getEpochProgress(at("2026-11-22T00:00:00.000Z"));

    expect(progress.progress).toBeCloseTo(0.5, 6);
  });

  it("reports the last moment before reset", () => {
    const progress = getEpochProgress(at("2026-11-25T11:59:59.000Z"));

    expect(progress.start.toISOString()).toBe("2026-11-18T12:00:00.000Z");
    expect(progress.progress).toBeGreaterThan(0.99);
  });
});
