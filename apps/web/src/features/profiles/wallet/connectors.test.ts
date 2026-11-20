// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";
import { deriveIdentityFromSeed, generateRandomSeed, k12, sign } from "@qubic.org/crypto";

import { QUBIC_SIGNED_MESSAGE_PREFIX } from "@/lib/profiles/signature";

import {
  normalizeWalletConnectSignResponse,
  qubicWalletPairingLink,
  toSafeWalletError,
  verifyMessageSignature,
} from "./connectors";

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

describe("WalletConnect response handling", () => {
  test("builds the official Qubic Wallet pairing deep link", () => {
    expect(qubicWalletPairingLink("wc:topic@2?relay-protocol=irn")).toBe(
      "qubic-wallet://pairwc/wc:topic@2?relay-protocol=irn",
    );
  });

  test("accepts signatures in hex, base64, nested result, and JSON string forms", async () => {
    const signature = await signatureFor(message);
    const base64 = Buffer.from(signature, "hex").toString("base64");

    expect(normalizeWalletConnectSignResponse(signature)).toBe(signature);
    expect(normalizeWalletConnectSignResponse({ signature })).toBe(signature);
    expect(normalizeWalletConnectSignResponse({ signatureHex: base64 })).toBe(signature);
    expect(normalizeWalletConnectSignResponse({ result: { signature_hex: signature } })).toBe(
      signature,
    );
    expect(normalizeWalletConnectSignResponse(JSON.stringify({ signature: base64 }))).toBe(
      signature,
    );
  });

  test("falls back to the signature appended to signedData", async () => {
    const signature = await signatureFor(`${QUBIC_SIGNED_MESSAGE_PREFIX}${message}`);
    const signedData = Buffer.concat([
      Buffer.from(`${QUBIC_SIGNED_MESSAGE_PREFIX}${message}`),
      Buffer.from(signature, "hex"),
    ]).toString("base64");

    expect(normalizeWalletConnectSignResponse({ signedData })).toBe(signature);
  });

  test("maps WalletConnect error codes without exposing raw codes", () => {
    const accountError = Object.assign(new Error("invalid params"), { code: -32602 });
    expect(toSafeWalletError(accountError)).toContain("Share the account");

    const rejected = Object.assign(new Error("rejected"), { code: 5000 });
    expect(toSafeWalletError(rejected)).toContain("rejected");

    const expired = new Error("Missing or invalid. Record was recently deleted (-32000)");
    expect(toSafeWalletError(expired)).toContain("session expired");
    expect(toSafeWalletError(expired)).not.toContain("-32000");
  });
});
