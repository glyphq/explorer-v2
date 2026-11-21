// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import type { PublicProfile } from "@/lib/profiles/types";

import { GLYPH_DONATIONS, groupKnownAddresses, mergeKnownAddresses } from "./known-address";

function profile(overrides: Partial<PublicProfile>): PublicProfile {
  return {
    bio: "",
    displayName: "Profile",
    identity: "A".repeat(60),
    kind: "wallet",
    socials: {},
    source: "wallet",
    updatedAt: 1,
    verification: "wallet",
    verifiedAt: 1,
    ...overrides,
  };
}

describe("known addresses", () => {
  test("puts Glyph donations first", () => {
    const addresses = mergeKnownAddresses([]);
    expect(addresses[0]).toBe(GLYPH_DONATIONS);
  });

  test("keeps API order after the curated address", () => {
    const addresses = mergeKnownAddresses([
      profile({
        displayName: "Gate.io",
        identity: "B".repeat(60),
        kind: "exchange",
        verification: "curated",
      }),
      profile({ displayName: "Alice", identity: "C".repeat(60) }),
    ]);

    expect(addresses.map((address) => address.displayName)).toEqual([
      "Glyph Donations",
      "Gate.io",
      "Alice",
    ]);
  });

  test("does not duplicate Glyph donations from the API", () => {
    const addresses = mergeKnownAddresses([
      profile({ displayName: "Glyph Donations", identity: GLYPH_DONATIONS.identity }),
    ]);

    expect(addresses).toHaveLength(1);
    expect(addresses[0]).toBe(GLYPH_DONATIONS);
  });

  test("groups identities, exchanges, then verified wallets", () => {
    const groups = groupKnownAddresses(
      mergeKnownAddresses([
        profile({
          displayName: "Gate.io",
          identity: "B".repeat(60),
          kind: "exchange",
          verification: "curated",
        }),
        profile({ displayName: "Alice", identity: "C".repeat(60) }),
      ]),
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Glyph identities",
      "Exchanges",
      "Verified wallets",
    ]);
    expect(groups[0]?.addresses[0]).toBe(GLYPH_DONATIONS);
  });
});
