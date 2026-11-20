"use client";

import { Spinner } from "@heroui/react";
import { useEffect, useRef } from "react";

export function InfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  loaded,
  noun = "records",
}: {
  fetchNextPage: () => void;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  loaded: number;
  noun?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div
      aria-live="polite"
      className="flex min-h-14 items-center justify-center gap-2 py-6 text-muted text-xs"
      ref={sentinelRef}
      role="status"
    >
      {isFetchingNextPage ? (
        <>
          <Spinner color="current" size="sm" />
          <span>Loading more {noun}</span>
        </>
      ) : hasNextPage ? (
        <span>Scroll for more</span>
      ) : (
        <span>
          End of {noun} · {loaded.toLocaleString("en-US")} loaded
        </span>
      )}
    </div>
  );
}
