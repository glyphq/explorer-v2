// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { buildChallengeMessage } from "./server";

describe("buildChallengeMessage", () => {
  test("stays single-line for Qubic Wallet WalletConnect signing", () => {
    const message = buildChallengeMessage({
      action: "claim",
      domain: "explorer.glyphq.org",
      expiresAt: "2026-11-20T00:10:00.000Z",
      identity: "A".repeat(60),
      issuedAt: "2026-11-20T00:00:00.000Z",
      nonce: "9f1c2d3e-4b5a-4c6d-8e7f-0123456789ab",
    });

    expect(message).not.toMatch(/[\n\r'\\]/);
    expect(message).toContain("Glyph Explorer profile |");
    expect(message).toContain("Action: Claim profile");
    expect(message).toContain("Domain: explorer.glyphq.org");
    expect(message).toContain("Signing this message proves you control this Qubic identity.");
  });
});
