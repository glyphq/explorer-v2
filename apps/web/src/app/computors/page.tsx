"use client";

import { EpochLink } from "@/components/explorer/links";
import { PageHeader } from "@/components/explorer/page-header";
import { RecordEmpty } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { ComputorTable, ComputorTableSkeleton } from "@/features/computors/computor-table";
import { useCurrentEpoch, useEpochComputors } from "@/lib/api/hooks";
import { formatInteger } from "@/lib/format";

export default function ComputorsPage() {
  const currentEpoch = useCurrentEpoch();
  const epoch = currentEpoch.data;
  const computors = useEpochComputors(epoch);
  const rows = computors.data?.data ?? [];
  const isLoading = currentEpoch.isLoading || (epoch !== undefined && computors.isLoading);
  const errorMessage = currentEpoch.isError
    ? "The current epoch could not be loaded."
    : computors.isError
      ? computors.error.message
      : null;

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description={
          epoch === undefined ? (
            "The computors elected for the current Qubic epoch."
          ) : rows.length > 0 ? (
            <>
              The {formatInteger(rows.length)} computors elected for epoch{" "}
              <EpochLink epoch={epoch} />.
            </>
          ) : (
            <>
              The computor set elected for epoch <EpochLink epoch={epoch} />.
            </>
          )
        }
        title="Computors"
      />

      {errorMessage ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            void currentEpoch.refetch();
            if (epoch !== undefined) {
              void computors.refetch();
            }
          }}
        />
      ) : isLoading ? (
        <ComputorTableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-[4px] bg-surface">
          <RecordEmpty>
            {epoch === undefined
              ? "No current epoch is available yet."
              : `No computor set indexed for epoch ${epoch}.`}
          </RecordEmpty>
        </div>
      ) : (
        <>
          <ComputorTable computors={rows} epoch={epoch} />
          <p className="flex min-h-14 items-center justify-center py-6 text-muted text-xs">
            End of computors · {formatInteger(rows.length)} loaded
          </p>
        </>
      )}
    </div>
  );
}
