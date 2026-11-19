"use client";

import { LayersIcon } from "@solar-icons/react/linear/layers";
import { PulseIcon } from "@solar-icons/react/linear/pulse";
import { RadioIcon } from "@solar-icons/react/linear/radio";
import { TransferHorizontalIcon } from "@solar-icons/react/linear/transfer-horizontal";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";

import { ActivityChart } from "@/components/explorer/activity-chart";
import { AnimatedNumber } from "@/components/explorer/animated-number";
import { BentoMetric } from "@/components/explorer/bento-metric";
import { EventTypeMosaic } from "@/components/explorer/event-type-mosaic";
import { LatestTransactions } from "@/components/explorer/latest-transactions";
import { MarketCard } from "@/components/explorer/market-card";
import { SectionCard } from "@/components/explorer/section-card";
import { TickPulse } from "@/components/explorer/tick-pulse";
import type { EventTypeCount } from "@/lib/api/generated/types.gen";
import {
  pageRows,
  useActivity,
  useEventTypes,
  useMarket,
  useNetwork,
  usePriceHistory,
  useStatus,
  useTransactions,
} from "@/lib/api/hooks";
import { useLiveStream } from "@/lib/api/live-stream";

export default function HomePage() {
  const status = useStatus();
  const network = useNetwork();
  const activity = useActivity(24);
  const market = useMarket();
  const priceHistory = usePriceHistory(24);
  const eventTypes = useEventTypes(8);
  const transactions = useTransactions({}, 8);
  const { ticks: liveTicks, transactions: liveTransactions } = useLiveStream();

  const statusData = status.data?.data;
  const networkData = network.data?.data;
  const marketData = market.data?.data;
  const head = statusData?.head ?? networkData?.head;
  const liveHead = liveTicks[0] ?? head;
  const snapshotHead = networkData?.head?.tick ?? head?.tick ?? 0;
  const pendingTicks = liveTicks.filter((tick) => tick.tick > snapshotHead);
  const pendingTransactions = pendingTicks.reduce(
    (total, tick) => total + (tick.transaction_count ?? 0),
    0,
  );
  const pendingEvents = pendingTicks.reduce((total, tick) => total + (tick.event_count ?? 0), 0);
  const transactionCount = networkData
    ? (networkData.transactions ?? 0) + pendingTransactions
    : undefined;
  const eventCount = networkData ? (networkData.events ?? 0) + pendingEvents : undefined;
  const latestEventTypes = (eventTypes.data?.data ?? []) as Array<
    EventTypeCount & { type_name?: string }
  >;
  const latestTransactions = pageRows(transactions.data?.pages);
  const transactionFeed = useMemo(() => {
    const byHash = new Map<string, (typeof latestTransactions)[number]>();
    for (const transaction of [...liveTransactions, ...latestTransactions]) {
      const key = transaction.hash ?? `${transaction.tick}-${transaction.tx_index}`;
      if (!byHash.has(key)) {
        byHash.set(key, transaction);
      }
    }
    return [...byHash.values()].slice(0, 6);
  }, [latestTransactions, liveTransactions]);
  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-8">
        <section className="grid grid-cols-2 gap-3 py-8 lg:grid-cols-4">
          <BentoMetric
            className="col-span-2 row-span-2"
            icon={RadioIcon}
            iconClassName="size-52 text-foreground sm:size-64"
            label="Head tick"
            loading={status.isLoading && !liveHead}
            value={<AnimatedNumber format={{ maximumFractionDigits: 0 }} value={liveHead?.tick} />}
            valueClassName="text-5xl sm:text-7xl"
            valueWidth="6ch"
          />
          <BentoMetric
            icon={LayersIcon}
            label="Epoch"
            loading={status.isLoading && !liveHead}
            value={
              <AnimatedNumber
                format={{ maximumFractionDigits: 0 }}
                value={liveHead?.epoch ?? networkData?.head?.epoch}
              />
            }
            valueWidth="3ch"
          />
          <BentoMetric
            icon={TransferHorizontalIcon}
            label="Transactions"
            loading={network.isLoading && transactionCount == null}
            value={
              <AnimatedNumber
                format={{ maximumFractionDigits: 2, notation: "compact" }}
                value={transactionCount}
              />
            }
            valueWidth="5ch"
          />
          <BentoMetric
            icon={PulseIcon}
            label="Events"
            loading={network.isLoading && eventCount == null}
            value={
              <AnimatedNumber
                format={{ maximumFractionDigits: 2, notation: "compact" }}
                value={eventCount}
              />
            }
            valueWidth="5ch"
          />
          <BentoMetric
            icon={UsersGroupRoundedIcon}
            label="Accounts"
            loading={network.isLoading}
            value={
              <AnimatedNumber
                format={{ maximumFractionDigits: 2, notation: "compact" }}
                value={networkData?.identities}
              />
            }
            valueWidth="5ch"
          />
          <MarketCard
            history={priceHistory.data?.data}
            isLoading={market.isLoading || priceHistory.isLoading}
            market={marketData}
          />
        </section>

        <section>
          <SectionCard
            action={
              <span className="font-mono text-[10px] text-muted uppercase tracking-[0.14em]">
                24 hourly buckets
              </span>
            }
            description="Deduplicated transaction and event counts from indexed ticks."
            title="Network activity"
          >
            <ActivityChart buckets={activity.data?.data} isLoading={activity.isLoading} />
          </SectionCard>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <SectionCard
            action={
              <Link className="text-muted text-xs hover:text-foreground" href={"/ticks" as Route}>
                All ticks
              </Link>
            }
            description="Newest verified ticks in the index."
            title="Latest ticks"
          >
            <TickPulse />
          </SectionCard>

          <SectionCard
            action={
              <Link
                className="text-muted text-xs hover:text-foreground"
                href={"/transactions" as Route}
              >
                All transactions
              </Link>
            }
            description="Most recent transfers observed in verified ticks."
            title="Latest transactions"
          >
            <LatestTransactions isLoading={transactions.isLoading} transactions={transactionFeed} />
          </SectionCard>
        </section>

        <section className="mt-4">
          <SectionCard
            description="Decoded event types across the indexed range."
            title="Event types"
          >
            <EventTypeMosaic events={latestEventTypes} isLoading={eventTypes.isLoading} />
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
