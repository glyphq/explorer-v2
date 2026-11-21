"use client";

import { PageHeader } from "@/components/explorer/page-header";
import { usePageLoading } from "@/components/explorer/page-reveal";
import { RecordEmpty } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import {
  KnownAddressTable,
  KnownAddressTableSkeleton,
} from "@/features/addresses/known-address-table";
import { mergeKnownAddresses } from "@/features/addresses/known-address";
import { useKnownProfiles } from "@/features/profiles/use-profile";

export default function KnownAddressesPage() {
  const known = useKnownProfiles();
  const addresses = mergeKnownAddresses(known.data ?? []);
  usePageLoading(known.isLoading);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Verified wallets, active exchange accounts, and official Glyph addresses."
        title="Known addresses"
      />

      {known.isError ? (
        <ErrorState
          message={known.error.message}
          onRetry={() => {
            known.refetch();
          }}
        />
      ) : known.isLoading ? (
        <KnownAddressTableSkeleton />
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl bg-surface">
          <RecordEmpty>No known addresses yet.</RecordEmpty>
        </div>
      ) : (
        <KnownAddressTable addresses={addresses} />
      )}
    </div>
  );
}
