// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import {
  exchangeBrandName,
  exchangeIconForIdentity,
  exchangeListingStatus,
  exchangeNameForIdentity,
  isExchangeActive,
  isExchangeDelisted,
} from "./brands";

const GATE_IDENTITY = "BYBYFUMBVLPUCANXEXTSKVMGFCJBMTLPPOFVPNSATABMWDGTMFXPLZLBCXJL";

describe("exchange brand status", () => {
  test("only Gate.io and Safetrade remain active", () => {
    expect(isExchangeActive("Gate.io")).toBe(true);
    expect(isExchangeActive("Safetrade 4")).toBe(true);
    expect(isExchangeActive("MEXC")).toBe(false);
    expect(isExchangeActive("Bitget 2")).toBe(false);
  });

  test("delisted venues are marked", () => {
    for (const name of ["Bit2Me", "Bitget 1", "CoinEx", "MEXC", "Seven Seas", "Tradeogre 3"]) {
      expect(isExchangeDelisted(name)).toBe(true);
    }
    expect(exchangeListingStatus("Unknown Exchange")).toBe("unknown");
  });

  test("strips account suffixes from grouped brands", () => {
    expect(exchangeBrandName("Bitget 3")).toBe("Bitget");
    expect(exchangeBrandName("Safetrade 5")).toBe("Safetrade");
    expect(exchangeBrandName("Gate.io")).toBe("Gate.io");
  });
});

describe("exchange identity avatars", () => {
  test("resolves curated identities to their brand artwork", () => {
    expect(exchangeNameForIdentity(GATE_IDENTITY)).toBe("Gate.io");
    expect(exchangeIconForIdentity(GATE_IDENTITY)).toBe("/exchanges/gate.png");
    expect(exchangeNameForIdentity(GATE_IDENTITY.toLowerCase())).toBe("Gate.io");
  });

  test("returns nothing for an ordinary wallet", () => {
    expect(exchangeNameForIdentity("A".repeat(60))).toBeUndefined();
    expect(exchangeIconForIdentity("A".repeat(60))).toBeUndefined();
  });
});
