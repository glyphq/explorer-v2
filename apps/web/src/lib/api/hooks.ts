"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  getActivityOptions,
  getAssetOptions,
  getEpochOptions,
  getIdentityActivityInfiniteOptions,
  getIdentityFlowOptions,
  getIdentityOptions,
  getLiveIdentityOptions,
  getMarketOptions,
  getNetworkOptions,
  getPriceHistoryOptions,
  getStatusOptions,
  getTickOptions,
  getTickQuorumEvidenceOptions,
  getTransactionEffectsOptions,
  getTransactionOptions,
  getTransactionStatusOptions,
  listAssetHoldersOptions,
  listAssetsInfiniteOptions,
  listAssetTransfersInfiniteOptions,
  listEpochComputorsOptions,
  listEpochsInfiniteOptions,
  listEventsInfiniteOptions,
  listEventTypesOptions,
  listIdentitiesInfiniteOptions,
  listIdentityCounterpartiesOptions,
  listIdentityEventsInfiniteOptions,
  listIdentityTransactionsInfiniteOptions,
  listTickEventsInfiniteOptions,
  listTicksInfiniteOptions,
  listTickTransactionsInfiniteOptions,
  listTopIdentitiesOptions,
  listTransactionsInfiniteOptions,
  searchOptions,
} from "./generated/@tanstack/react-query.gen";
import type { PageMeta, Tick } from "./generated/types.gen";
import { useLiveStream } from "./live-stream";

const REFRESH_INTERVAL = 15_000;
const FIRST_PAGE = undefined as unknown as string;

export function useNetwork() {
  return useQuery({
    ...getNetworkOptions(),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: REFRESH_INTERVAL,
  });
}

export function useStatus() {
  return useQuery({
    ...getStatusOptions(),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: REFRESH_INTERVAL,
  });
}

export function useActivity(limit = 24, interval = 3600) {
  return useQuery({
    ...getActivityOptions({ query: { interval, limit } }),
    placeholderData: keepPreviousData,
  });
}

export function useEventTypes(limit = 8) {
  return useQuery({
    ...listEventTypesOptions({ query: { limit } }),
    placeholderData: keepPreviousData,
  });
}

export function useTopIdentities(limit = 8) {
  return useQuery({
    ...listTopIdentitiesOptions({ query: { limit } }),
    refetchInterval: REFRESH_INTERVAL,
  });
}

export function useMarket() {
  return useQuery({
    ...getMarketOptions(),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

export function usePriceHistory(hours = 168) {
  return useQuery({
    ...getPriceHistoryOptions({ query: { hours } }),
    placeholderData: keepPreviousData,
  });
}

export function useTicks(limit = 25, epoch?: number) {
  return useInfiniteQuery({
    ...listTicksInfiniteOptions({ query: { epoch, limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useTick(tick: number | undefined) {
  return useQuery({
    ...getTickOptions({ path: { tick: tick ?? 0 } }),
    enabled: Number.isInteger(tick) && (tick ?? 0) > 0,
    refetchInterval: REFRESH_INTERVAL,
  });
}

export function useTickTransactions(tick: number, limit = 25) {
  return useInfiniteQuery({
    ...listTickTransactionsInfiniteOptions({
      path: { tick },
      query: { limit },
    }),
    enabled: Number.isInteger(tick) && tick > 0,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useTickEvents(tick: number, limit = 25) {
  return useInfiniteQuery({
    ...listTickEventsInfiniteOptions({ path: { tick }, query: { limit } }),
    enabled: Number.isInteger(tick) && tick > 0,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useTickEvidence(tick: number | undefined) {
  return useQuery({
    ...getTickQuorumEvidenceOptions({ path: { tick: tick ?? 0 } }),
    enabled: Number.isInteger(tick) && (tick ?? 0) > 0,
  });
}

export function useTransactions(
  filters: { epoch?: number; tick?: number; identity?: string },
  limit = 25,
) {
  return useInfiniteQuery({
    ...listTransactionsInfiniteOptions({ query: { ...filters, limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(hash: string | undefined) {
  return useQuery({
    ...getTransactionOptions({ path: { hash: hash ?? "" } }),
    enabled: Boolean(hash),
  });
}

export function useTransactionEffects(hash: string | undefined) {
  return useQuery({
    ...getTransactionEffectsOptions({ path: { hash: hash ?? "" } }),
    enabled: Boolean(hash),
  });
}

export function useTransactionStatus(hash: string | undefined) {
  return useQuery({
    ...getTransactionStatusOptions({ path: { hash: hash ?? "" } }),
    enabled: Boolean(hash),
    refetchInterval: 15_000,
  });
}

export function useIdentities(limit = 25) {
  return useInfiniteQuery({
    ...listIdentitiesInfiniteOptions({ query: { limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useIdentity(identity: string | undefined) {
  return useQuery({
    ...getIdentityOptions({ path: { identity: identity ?? "" } }),
    enabled: Boolean(identity),
  });
}

export function useLiveIdentity(identity: string | undefined) {
  return useQuery({
    ...getLiveIdentityOptions({ path: { identity: identity ?? "" } }),
    enabled: Boolean(identity),
    refetchInterval: REFRESH_INTERVAL,
  });
}

export function useIdentityActivity(identity: string, limit = 25) {
  return useInfiniteQuery({
    ...getIdentityActivityInfiniteOptions({
      path: { identity },
      query: { limit },
    }),
    enabled: Boolean(identity),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useIdentityTransactions(identity: string, limit = 25) {
  return useInfiniteQuery({
    ...listIdentityTransactionsInfiniteOptions({
      path: { identity },
      query: { limit },
    }),
    enabled: Boolean(identity),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useIdentityEvents(identity: string, limit = 25) {
  return useInfiniteQuery({
    ...listIdentityEventsInfiniteOptions({
      path: { identity },
      query: { limit },
    }),
    enabled: Boolean(identity),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useIdentityFlow(identity: string, limit = 168, interval = 3600) {
  return useQuery({
    ...getIdentityFlowOptions({
      path: { identity },
      query: { interval, limit },
    }),
    enabled: Boolean(identity),
    placeholderData: keepPreviousData,
  });
}

export function useIdentityCounterparties(
  identity: string,
  direction: "all" | "incoming" | "outgoing" = "all",
  limit = 20,
) {
  return useQuery({
    ...listIdentityCounterpartiesOptions({
      path: { identity },
      query: { direction, limit },
    }),
    enabled: Boolean(identity),
    placeholderData: keepPreviousData,
  });
}

export function useEpochs(limit = 25) {
  return useInfiniteQuery({
    ...listEpochsInfiniteOptions({ query: { limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useEpoch(epoch: number | undefined) {
  return useQuery({
    ...getEpochOptions({ path: { epoch: epoch ?? 0 } }),
    enabled: Number.isInteger(epoch) && (epoch ?? 0) >= 0,
  });
}

export function useEpochComputors(epoch: number | undefined) {
  return useQuery({
    ...listEpochComputorsOptions({ path: { epoch: epoch ?? 0 } }),
    enabled: Number.isInteger(epoch) && (epoch ?? 0) >= 0,
  });
}

export function useAssets(limit = 25, issuer?: string) {
  return useInfiniteQuery({
    ...listAssetsInfiniteOptions({ query: { issuer, limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useAsset(issuer: string | undefined, name: string | undefined) {
  return useQuery({
    ...getAssetOptions({ path: { issuer: issuer ?? "", name: name ?? "" } }),
    enabled: Boolean(issuer && name),
  });
}

export function useAssetHolders(issuer: string, name: string, limit = 100) {
  return useQuery({
    ...listAssetHoldersOptions({ path: { issuer, name }, query: { limit } }),
    enabled: Boolean(issuer && name),
    retry: false,
  });
}

export function useAssetTransfers(
  issuer: string,
  name: string,
  kind: "all" | "ownership" | "possession" = "all",
  limit = 25,
) {
  return useInfiniteQuery({
    ...listAssetTransfersInfiniteOptions({
      path: { issuer, name },
      query: { kind, limit },
    }),
    enabled: Boolean(issuer && name),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useEvents(filters: { epoch?: number; tick?: number; type?: string }, limit = 25) {
  return useInfiniteQuery({
    ...listEventsInfiniteOptions({ query: { ...filters, limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
    placeholderData: keepPreviousData,
  });
}

export function useSearch(query: string) {
  return useQuery({
    ...searchOptions({ query: { q: query } }),
    enabled: query.trim().length >= 3,
    staleTime: 30_000,
  });
}

export function pageRows<T>(pages: Array<{ data: T[]; meta: PageMeta }> | undefined): T[] {
  return pages?.flatMap((page) => page.data) ?? [];
}

export function useTickPulse(limit = 100) {
  const seed = useTicks(limit);
  const { connected, ticks: live } = useLiveStream();

  const seedRows = useMemo(
    () =>
      pageRows(seed.data?.pages).filter(
        (tick): tick is Tick & { tick: number } => typeof tick.tick === "number",
      ),
    [seed.data?.pages],
  );
  const ticks = useMemo(() => {
    const byTick = new Map<number, Tick & { tick: number }>();
    for (const tick of [...live, ...seedRows]) {
      if (!byTick.has(tick.tick)) {
        byTick.set(tick.tick, tick);
      }
    }
    return [...byTick.values()].sort((left, right) => right.tick - left.tick).slice(0, limit);
  }, [live, seedRows, limit]);

  return {
    connected,
    error: seed.error,
    isError: seed.isError,
    isLoading: seed.isLoading,
    refetch: seed.refetch,
    ticks,
  };
}
