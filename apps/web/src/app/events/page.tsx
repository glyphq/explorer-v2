"use client";

import { EventFeed } from "@/components/explorer/event-feed";
import { PageHeader } from "@/components/explorer/page-header";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useEvents } from "@/lib/api/hooks";

export default function EventsPage() {
  const events = useEvents({}, 100);
  const rows = pageRows(events.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Decoded events from transfers and contract calls, with the accounts involved."
        title="Events"
      />

      {events.isError ? (
        <ErrorState
          message={events.error.message}
          onRetry={() => {
            events.refetch();
          }}
        />
      ) : (
        <EventFeed
          events={rows}
          fetchNextPage={() => {
            events.fetchNextPage();
          }}
          hasNextPage={events.hasNextPage}
          isFetchingNextPage={events.isFetchingNextPage}
          isLoading={events.isLoading}
        />
      )}
    </div>
  );
}
