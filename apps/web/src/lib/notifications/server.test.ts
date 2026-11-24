// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { assertSameOrigin, parsePushSubscription, PushError } from "./server";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { auth: "b".repeat(22), p256dh: "a".repeat(87) },
};

describe("parsePushSubscription", () => {
  test("accepts a browser subscription", () => {
    expect(parsePushSubscription(subscription)).toEqual(subscription);
  });

  test("requires HTTPS endpoints", () => {
    expect(() =>
      parsePushSubscription({ ...subscription, endpoint: "http://fcm.googleapis.com/fcm/send/a" }),
    ).toThrow(PushError);
  });

  test("rejects malformed keys", () => {
    expect(() =>
      parsePushSubscription({
        ...subscription,
        keys: { auth: "b".repeat(22), p256dh: "not+base64/url" },
      }),
    ).toThrow(PushError);
  });

  test("rejects a missing key object", () => {
    expect(() => parsePushSubscription({ endpoint: subscription.endpoint })).toThrow(PushError);
  });
});

describe("assertSameOrigin", () => {
  test("allows same-origin subscribe calls", () => {
    const request = new Request("https://explorer.glyphq.org/api/notifications", {
      headers: { origin: "https://explorer.glyphq.org" },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  test("rejects cross-site subscribe calls", () => {
    const request = new Request("https://explorer.glyphq.org/api/notifications", {
      headers: { origin: "https://evil.example" },
    });
    expect(() => assertSameOrigin(request)).toThrow(PushError);
  });
});
