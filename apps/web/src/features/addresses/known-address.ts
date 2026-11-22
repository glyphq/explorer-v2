import type { PublicProfile } from "@/lib/profiles/types";

export type KnownAddressKind = "exchange" | "glyph" | "wallet";

export type KnownAddress = {
  displayName: string;
  identity: string;
  kind: KnownAddressKind;
};

export const GLYPH_DONATIONS: KnownAddress = {
  displayName: "Glyph Donations",
  identity: "LOGCQXSJIQFNNFHFBADRFLVNNXGBVKZGJXOPZSHTQDKNRIIFWXXPYVUCUSTD",
  kind: "glyph",
};

export const KNOWN_ADDRESS_GROUPS = [
  { kind: "glyph", label: "Glyph identities" },
  { kind: "exchange", label: "Exchanges" },
  { kind: "wallet", label: "Verified wallets" },
] as const satisfies ReadonlyArray<{ kind: KnownAddressKind; label: string }>;

export function knownAddressFromProfile(profile: PublicProfile): KnownAddress {
  return {
    displayName: profile.displayName,
    identity: profile.identity,
    kind: profile.kind,
  };
}

export function mergeKnownAddresses(profiles: PublicProfile[]): KnownAddress[] {
  const seen = new Set<string>([GLYPH_DONATIONS.identity]);
  return [
    GLYPH_DONATIONS,
    ...profiles.map(knownAddressFromProfile).filter((address) => {
      if (seen.has(address.identity)) {
        return false;
      }
      seen.add(address.identity);
      return true;
    }),
  ];
}

export function groupKnownAddresses(addresses: KnownAddress[]) {
  return KNOWN_ADDRESS_GROUPS.map((group) => ({
    ...group,
    addresses: addresses.filter((address) => address.kind === group.kind),
  })).filter((group) => group.addresses.length > 0);
}
