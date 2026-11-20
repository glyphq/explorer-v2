"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/explorer/state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <div className="page-width px-4 py-16 lg:px-8">
      <ErrorState
        message="This route failed to load. Retry the request. If it persists, the index may be unavailable."
        onRetry={reset}
      />
    </div>
  );
}
