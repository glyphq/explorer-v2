"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { CcfTreasuryStrip } from "@/components/explorer/ccf-treasury-strip";
import { InfiniteScroll } from "@/components/explorer/infinite-scroll";
import { RecordEmpty } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { readProposals } from "@/features/proposals/data";
import { ProposalsTable, ProposalsTableSkeleton } from "@/features/proposals/proposals-table";
import type { CcfTreasury } from "@/lib/ccf-treasury";
import { countLabel } from "@/lib/format";

const PAGE_SIZE = 25;

async function readTreasury(signal: AbortSignal) {
  const response = await fetch("/api/ccf-treasury", { signal });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { treasury?: CcfTreasury };
  return body.treasury ?? null;
}

export function ProposalsExplorer() {
  const proposalsQuery = useQuery({
    queryFn: ({ signal }) => readProposals(signal),
    queryKey: ["proposals"],
    staleTime: 30_000,
  });
  const treasuryQuery = useQuery({
    queryFn: ({ signal }) => readTreasury(signal),
    queryKey: ["ccf-treasury"],
    staleTime: 60_000,
  });
  const [visible, setVisible] = useState(PAGE_SIZE);

  const data = proposalsQuery.data;
  const proposals = useMemo(() => (data ? [...data.active, ...data.ended] : []), [data]);
  const rows = proposals.slice(0, visible);
  const hasNextPage = visible < proposals.length;
  const fetchNextPage = useCallback(() => {
    setVisible((count) => Math.min(count + PAGE_SIZE, proposals.length));
  }, [proposals.length]);
  const treasury = treasuryQuery.data;

  if (proposalsQuery.isPending) {
    return <ProposalsTableSkeleton />;
  }

  if (proposalsQuery.isError || !data) {
    return (
      <ErrorState
        message={proposalsQuery.error?.message}
        onRetry={() => {
          proposalsQuery.refetch().catch(() => undefined);
          treasuryQuery.refetch().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <>
      {treasury ? <CcfTreasuryStrip treasury={treasury} /> : null}

      <div className="mb-6 flex flex-wrap gap-2 text-muted text-xs">
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(data.active.length, "open proposal")}
        </span>
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(data.ended.length, "decided proposal")}
        </span>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-[4px] bg-surface">
          <RecordEmpty>No proposals are available yet.</RecordEmpty>
        </div>
      ) : (
        <>
          <ProposalsTable proposals={rows} />
          <InfiniteScroll
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={false}
            loaded={rows.length}
            noun="proposals"
          />
        </>
      )}
    </>
  );
}
