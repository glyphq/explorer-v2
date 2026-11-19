import { getContractDefinition } from "@glyph-oss/contracts";

import { GLYPH_API_URL } from "@/lib/api/hey-api";

export type CcfTreasury = {
  balance: number;
  balanceUsd?: number;
  identity: string;
  incoming: number;
  outgoing: number;
  incomingTransfers: number;
  outgoingTransfers: number;
  priceUsd?: number;
  stale?: boolean;
};

type WalletResponse = {
  data?: {
    entity?: {
      balance?: number;
      incoming_amount?: number;
      incoming_transfers?: number;
      outgoing_amount?: number;
      outgoing_transfers?: number;
    };
  };
};

type PriceResponse = {
  data?: {
    price_usdt?: number;
    stale?: boolean;
  };
};

async function readJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCcfTreasury(): Promise<CcfTreasury | null> {
  const identity = getContractDefinition("CCF").contractAddress;
  const [wallet, price] = await Promise.all([
    readJson<WalletResponse>(`${GLYPH_API_URL}/v1/wallets/${identity}`),
    readJson<PriceResponse>(`${GLYPH_API_URL}/v1/prices/latest`),
  ]);
  const entity = wallet?.data?.entity;
  if (!entity) {
    return null;
  }
  const balance = Number(entity.balance ?? 0);
  const priceUsd = Number(price?.data?.price_usdt ?? 0);
  return {
    balance,
    balanceUsd: priceUsd > 0 ? balance * priceUsd : undefined,
    identity,
    incoming: Number(entity.incoming_amount ?? 0),
    incomingTransfers: Number(entity.incoming_transfers ?? 0),
    outgoing: Number(entity.outgoing_amount ?? 0),
    outgoingTransfers: Number(entity.outgoing_transfers ?? 0),
    priceUsd: priceUsd > 0 ? priceUsd : undefined,
    stale: price?.data?.stale,
  };
}
