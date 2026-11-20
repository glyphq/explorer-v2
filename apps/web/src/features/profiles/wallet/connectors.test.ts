// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";
import { deriveIdentityFromSeed, generateRandomSeed, k12, sign } from "@qubic.org/crypto";

import { QUBIC_SIGNED_MESSAGE_PREFIX } from "@/lib/profiles/signature";

import { verifyMessageSignature } from "./connectors";

const seed = generateRandomSeed();
const identity = deriveIdentityFromSeed(seed);
const message = "Glyph Explorer profile challenge";

async function signatureFor(value: string): Promise<string> {
  const signature = await sign(k12(new TextEncoder().encode(value), 32), seed);
  return Buffer.from(signature).toString("hex");
}

describe("wallet message verification", () => {
  test("accepts a raw message signature", async () => {
    const signature = await signatureFor(message);
    expect(signature).toHaveLength(128);
    expect(verifyMessageSignature(message, signature, identity)).toBe(true);
  });

  test("accepts the Qubic Wallet prefixed signature when enabled", async () => {
    const signature = await signatureFor(`${QUBIC_SIGNED_MESSAGE_PREFIX}${message}`);
    expect(verifyMessageSignature(message, signature, identity, true)).toBe(true);
    expect(verifyMessageSignature(message, signature, identity)).toBe(false);
  });

  test("rejects a signature for another message", async () => {
    expect(verifyMessageSignature(`${message} `, await signatureFor(message), identity)).toBe(
      false,
    );
  });
});
