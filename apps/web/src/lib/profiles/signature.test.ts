// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";
import { deriveIdentityFromSeed, generateRandomSeed, k12, sign } from "@qubic.org/crypto";

import { bytesToHex, normalizeSignatureHex, verifyChallengeSignature } from "./signature";
import { QUBIC_SIGNED_MESSAGE_PREFIX } from "./signature";

const seed = generateRandomSeed();
const identity = deriveIdentityFromSeed(seed);
const otherIdentity = deriveIdentityFromSeed(generateRandomSeed());

const message = [
  "Glyph Explorer profile",
  "---------------------",
  `Identity: ${identity}`,
  "Action: Claim profile",
  "Domain: explorer.glyphq.org",
  "Nonce: 9f1c2d3e-4b5a-4c6d-8e7f-0123456789ab",
  "Issued At: 2026-11-20T00:00:00.000Z",
  "Expiration Time: 2026-11-20T00:10:00.000Z",
  "",
  "Signing this message proves you control this Qubic identity. It does not authorize a transaction.",
].join("\n");

const signature = await sign(k12(new TextEncoder().encode(message), 32), seed);
const signatureHex = bytesToHex(signature);
const prefixedSignature = await sign(
  k12(new TextEncoder().encode(`${QUBIC_SIGNED_MESSAGE_PREFIX}${message}`), 32),
  seed,
);
const prefixedSignatureHex = bytesToHex(prefixedSignature);

describe("verifyChallengeSignature", () => {
  test("accepts a valid SchnorrQ signature over the exact message", () => {
    expect(verifyChallengeSignature(message, signatureHex, identity)).toBe(true);
  });

  test("accepts an upper-case hex signature", () => {
    expect(verifyChallengeSignature(message, signatureHex.toUpperCase(), identity)).toBe(true);
  });

  test("accepts the Qubic Wallet prefixed signature when enabled", () => {
    expect(
      verifyChallengeSignature(message, prefixedSignatureHex, identity, {
        allowQubicMessagePrefix: true,
      }),
    ).toBe(true);
    expect(verifyChallengeSignature(message, prefixedSignatureHex, identity)).toBe(false);
  });

  test("rejects the same signature for a different message", () => {
    expect(verifyChallengeSignature(`${message}\n`, signatureHex, identity)).toBe(false);
    expect(
      verifyChallengeSignature(message.replace("Claim", "Revoke"), signatureHex, identity),
    ).toBe(false);
  });

  test("rejects malformed hex", () => {
    expect(verifyChallengeSignature(message, "not-hex", identity)).toBe(false);
    expect(verifyChallengeSignature(message, signatureHex.slice(0, -2), identity)).toBe(false);
    expect(verifyChallengeSignature(message, `${signatureHex}00`, identity)).toBe(false);
    expect(verifyChallengeSignature(message, "zz".repeat(64), identity)).toBe(false);
  });

  test("rejects a signature from a different identity", () => {
    expect(verifyChallengeSignature(message, signatureHex, otherIdentity)).toBe(false);
  });
});

describe("normalizeSignatureHex", () => {
  test("normalizes a 64-byte hex signature", () => {
    expect(normalizeSignatureHex(`0x${signatureHex.toUpperCase()}`)).toBe(signatureHex);
  });

  test("rejects values that are not 64 bytes of hex", () => {
    expect(normalizeSignatureHex("0x1234")).toBeNull();
    expect(normalizeSignatureHex(signatureHex.slice(2))).toBeNull();
    expect(normalizeSignatureHex(42)).toBeNull();
  });
});
