"use client";

import { LayersIcon } from "@solar-icons/react/linear/layers";
import { PulseIcon } from "@solar-icons/react/linear/pulse";
import { RadioIcon } from "@solar-icons/react/linear/radio";
import { TransferHorizontalIcon } from "@solar-icons/react/linear/transfer-horizontal";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";

import { ActivityChart } from "@/components/explorer/activity-chart";
import { AnimatedNumber } from "@/components/explorer/animated-number";
import { BentoMetric } from "@/components/explorer/bento-metric";
import { EventTypeMosaic } from "@/components/explorer/event-type-mosaic";
import { MarketCard } from "@/components/explorer/market-card";
import { SectionCard } from "@/components/explorer/section-card";
import { TickPulse } from "@/components/explorer/tick-pulse";
import type { EventTypeCount } from "@/lib/api/generated/types.gen";
import {
  useActivity,
  useEventTypes,
  useMarket,
  useNetwork,
  usePriceHistory,
  useStatus,
} from "@/lib/api/hooks";
import { useLiveStream } from "@/lib/api/live-stream";

export default function HomePage() {
  const status = useStatus();
  const network = useNetwork();
  const activity = useActivity(24);
  const market = useMarket();
  const priceHistory = usePriceHistory(24);
  const eventTypes = useEventTypes(8);
  const { ticks: liveTicks } = useLiveStream();

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
  return (
    <div className="pb-8">
      <div className="page-width px-4 lg:px-8">
        <section className="grid grid-cols-2 gap-3 py-8 lg:grid-cols-4">
          <BentoMetric
            className="col-span-2 row-span-2"
            icon={RadioIcon}
            iconClassName="size-52 text-foreground sm:size-64"
            label="Head tick"
            loading={status.isLoading && !liveHead}
            value={<AnimatedNumber format={{ maximumFractionDigits: 0 }} value={liveHead?.tick} />}
            valueClassName="text-4xl min-[380px]:text-5xl sm:text-7xl"
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
            label="Identities"
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
            action={<span className="text-muted text-xs">Last 24 hours</span>}
            description="How busy the network was, hour by hour."
            title="Network activity"
          >
            <ActivityChart buckets={activity.data?.data} isLoading={activity.isLoading} />
          </SectionCard>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <SectionCard
            description="The newest ticks confirmed by the network."
            title="Latest ticks"
          >
            <TickPulse />
          </SectionCard>

          <SectionCard description="The kinds of events the index has decoded." title="Event types">
            <EventTypeMosaic events={latestEventTypes} isLoading={eventTypes.isLoading} />
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
