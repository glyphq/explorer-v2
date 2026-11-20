// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, it } from "bun:test";

import {
  antSolutionResult,
  decodeCustomMessage,
  decodeSpecialInput,
  isZeroIdentity,
  parseSpecialHash,
  specialSlot,
  specialTransactionType,
  ZERO_IDENTITY,
} from "./special";

const ANT_INPUT =
  "192c7c0505000000092c7c050e0d0000012100f3921e55a89ac75c6676636b755aa0badc8141621dc81671b8e0060597";
const ANT_MESSAGE =
  "414e545f534f4c553fe0dcb5e2f0d1a1603e39303a0ba60d014965235568760dbd1c436dd04723ad012100f3921e55a89ac75c6676636b755aa0badc8141621dc81671b8e0060597192c7c0505000000092c7c050e0d000000000000";

describe("zero identity", () => {
  it("recognizes the protocol zero address", () => {
    expect(isZeroIdentity(ZERO_IDENTITY)).toBe(true);
    expect(isZeroIdentity(ZERO_IDENTITY.toLowerCase())).toBe(true);
    expect(isZeroIdentity("BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANMIG")).toBe(
      false,
    );
  });
});

describe("special slots", () => {
  it("maps END_TICK slots to their procedure", () => {
    const slot = specialSlot(4099);
    expect(slot.label).toBe("END_TICK");
    expect(slot.displayLabel).toBe("[END_TICK]");
  });

  it("parses numeric and named synthetic hashes", () => {
    expect(parseSpecialHash("special:92023284:4099")).toMatchObject({
      displayLabel: "[END_TICK]",
      hash: "special:92023284:4099",
      tick: 92023284,
    });
    expect(parseSpecialHash("special%3A92023284%3A4099")?.label).toBe("END_TICK");
    expect(parseSpecialHash("special:92023284:END_TICK")?.slot).toBe(4099);
    expect(parseSpecialHash("special:92023284:[END_TICK]")?.slot).toBe(4099);
  });

  it("rejects malformed synthetic hashes", () => {
    expect(parseSpecialHash("")).toBeNull();
    expect(parseSpecialHash("special:0:4099")).toBeNull();
    expect(parseSpecialHash("special:92023284:2048")).toBeNull();
    expect(parseSpecialHash("special:92023284:-1")).toBeNull();
    expect(parseSpecialHash("special:92023284:UNKNOWN")).toBeNull();
    expect(parseSpecialHash("92023284")).toBeNull();
  });
});

describe("special transaction types", () => {
  it("labels ant colony solutions", () => {
    expect(specialTransactionType(12)).toMatchObject({
      inputType: 12,
      label: "Ant colony solution",
    });
  });

  it("falls back for unknown system types", () => {
    expect(specialTransactionType(8).label).toBe("System transaction");
  });
});

describe("special input decoding", () => {
  it("decodes an ant colony solution payload", () => {
    const decoded = decodeSpecialInput(12, ANT_INPUT);
    const values = Object.fromEntries(decoded.fields.map((field) => [field.label, field.value]));
    expect(values).toMatchObject({
      "Anchor tick": "92,023,817",
      "Claimed score": "3,342",
      "Parent solution": "5",
      "Parent tick": "92,023,833",
    });
  });

  it("decodes the ant colony custom message", () => {
    const message = decodeCustomMessage(ANT_MESSAGE);
    expect(message).toMatchObject({
      label: "Ant colony solution",
      sourcePublicKey: "3fe0dcb5e2f0d1a1603e39303a0ba60d014965235568760dbd1c436dd04723ad",
      status: { label: "Valid", tone: "success" },
    });
    const values = Object.fromEntries(
      (message?.fields ?? []).map((field) => [field.label, field.value]),
    );
    expect(values).toMatchObject({
      "Anchor tick": "92,023,817",
      "Parent solution": "5",
      "Parent tick": "92,023,833",
      Score: "3,342",
    });
  });

  it("labels system custom-message markers", () => {
    expect(decodeCustomMessage("5354415f44444956")?.label).toBe("Dividend distribution started");
  });

  it("maps ant solution result codes", () => {
    expect(antSolutionResult(0)).toMatchObject({
      accepted: true,
      label: "Valid",
      refunded: true,
    });
    expect(antSolutionResult(13)).toMatchObject({
      accepted: false,
      label: "Superseded in tick",
      refunded: true,
    });
  });
});
