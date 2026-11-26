"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  getActivityOptions,
  getEpochOptions,
  getIdentityActivityInfiniteOptions,
  getIdentityFlowOptions,
  getIdentityOptions,
  getLiveIdentityOptions,
  getMarketOptions,
  getPriceHistoryOptions,
  getStatusOptions,
  getTickOptions,
  getTickQuorumEvidenceOptions,
  getTransactionEffectsOptions,
  getTransactionStatusOptions,
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
  listWalletAssetsOptions,
  searchOptions,
} from "./generated/@tanstack/react-query.gen";
import { listTickEvents } from "./generated/sdk.gen";
import type { PageMeta, Tick } from "./generated/types.gen";
import { useLiveStream } from "./live-stream";

const REFRESH_INTERVAL = 15_000;
const HISTORY_STALE_TIME = 5 * 60_000;
const FIRST_PAGE = undefined as unknown as string;

export function useStatus() {
  return useQuery({
    ...getStatusOptions(),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: REFRESH_INTERVAL,
  });
}

export function useCurrentEpoch() {
  return useQuery({
    ...getStatusOptions(),
    refetchInterval: REFRESH_INTERVAL,
    select: (status) => status.data?.head?.epoch ?? status.data?.network?.epoch ?? undefined,
    staleTime: REFRESH_INTERVAL,
  });
}

export function useActivity(limit = 24, interval = 3600) {
  return useQuery({
    ...getActivityOptions({ query: { interval, limit } }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

export function useEventTypes(limit = 8) {
  return useQuery({
    ...listEventTypesOptions({ query: { limit } }),
    placeholderData: keepPreviousData,
    staleTime: HISTORY_STALE_TIME,
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
    staleTime: HISTORY_STALE_TIME,
  });
}

export function useTicks(limit = 25, epoch?: number) {
  return useInfiniteQuery({
    ...listTicksInfiniteOptions({ query: { epoch, limit } }),
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    initialPageParam: FIRST_PAGE,
  });
}

export function useTick(
  tick: number | undefined,
  refetchInterval: number | false = REFRESH_INTERVAL,
) {
  return useQuery({
    ...getTickOptions({ path: { tick: tick ?? 0 } }),
    enabled: Number.isInteger(tick) && (tick ?? 0) > 0,
    refetchInterval,
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

const SPECIAL_EVENT_PAGE_SIZE = 200;
const SPECIAL_EVENT_PAGE_LIMIT = 20;

/**
 * Special transactions are synthetic hashes (`special:<tick>:<slot>`) and are not addressable
 * through the transaction endpoint. Read the tick event stream instead, following cursors until
 * the synthetic hash is found.
 */
export function useSpecialEvents(tick: number, hash: string) {
  return useQuery({
    enabled: Number.isInteger(tick) && tick > 0 && Boolean(hash),
    queryFn: async () => {
      let cursor: string | undefined;
      const seen = new Set<string>();
      for (let pageIndex = 0; pageIndex < SPECIAL_EVENT_PAGE_LIMIT; pageIndex += 1) {
        const response = await listTickEvents({
          path: { tick },
          query: { cursor, limit: SPECIAL_EVENT_PAGE_SIZE },
        });
        if (!response.data) {
          throw new Error("The tick event index did not answer.");
        }
        const eventPage = response.data;
        const matches = eventPage.data.filter(
          (event) => event.tx_hash?.toLowerCase() === hash.toLowerCase(),
        );
        if (matches.length > 0) {
          return matches;
        }
        const next = eventPage.meta?.next_cursor ?? undefined;
        if (!next || seen.has(next)) {
          return [];
        }
        seen.add(next);
        cursor = next;
      }
      return [];
    },
    queryKey: ["special-events", tick, hash],
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
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

export function useTransactionEffects(hash: string | undefined) {
  return useQuery({
    ...getTransactionEffectsOptions({ path: { hash: hash ?? "" } }),
    enabled: Boolean(hash),
    staleTime: 60_000,
  });
}

export function useTransactionStatus(hash: string | undefined) {
  return useQuery({
    ...getTransactionStatusOptions({ path: { hash: hash ?? "" } }),
    enabled: Boolean(hash),
    refetchInterval: 60_000,
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
    // Never paint a previous visit's peer balance while the new read is in flight.
    gcTime: 0,
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
    refetchInterval: (query) =>
      query.state.data?.data?.closed === false ? REFRESH_INTERVAL : false,
  });
}

export function useEpochComputors(epoch: number | undefined) {
  return useQuery({
    ...listEpochComputorsOptions({ path: { epoch: epoch ?? 0 } }),
    enabled: Number.isInteger(epoch) && (epoch ?? 0) >= 0,
  });
}

export function useWalletAssets(
  identity: string | undefined,
  kind: "all" | "issued" | "owned" | "possessed" = "all",
) {
  return useQuery({
    ...listWalletAssetsOptions({ path: { identity: identity ?? "" }, query: { kind } }),
    enabled: Boolean(identity),
    refetchInterval: REFRESH_INTERVAL,
    retry: false,
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
