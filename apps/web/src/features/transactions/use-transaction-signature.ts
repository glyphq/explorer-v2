import { useQuery } from "@tanstack/react-query";

import { GLYPH_API_URL } from "@/lib/api/hey-api";
import { findTransactionSignature } from "@/lib/transactions/signature";

export function useTransactionSignature(hash: string, tick: number | undefined) {
  return useQuery({
    enabled: tick !== undefined && hash.length > 0,
    queryFn: async ({ signal }) => {
      if (tick === undefined) {
        return null;
      }

      const response = await fetch(`${GLYPH_API_URL}/v1/ticks/${tick}/raw?section=transactions`, {
        signal,
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Tick archive request failed (${response.status}).`);
      }

      return findTransactionSignature(new Uint8Array(await response.arrayBuffer()), hash);
    },
    queryKey: ["transaction-signature", tick, hash],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
