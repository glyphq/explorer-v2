"use client";

import { Button, Spinner } from "@heroui/react";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";

export function LoadMore({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  loaded,
}: {
  fetchNextPage: () => void;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  loaded: number;
}) {
  if (!hasNextPage) {
    return (
      <p className="py-6 text-center text-muted text-xs">
        {loaded === 0
          ? "No rows to show."
          : `End of results · ${loaded.toLocaleString("en-US")} rows`}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Button isDisabled={isFetchingNextPage} onPress={fetchNextPage} size="sm" variant="secondary">
        {isFetchingNextPage ? (
          <Spinner color="current" size="sm" />
        ) : (
          <AltArrowDownIcon className="size-4" />
        )}
        Load more
      </Button>
      <p className="text-muted text-xs">{loaded.toLocaleString("en-US")} rows loaded</p>
    </div>
  );
}
