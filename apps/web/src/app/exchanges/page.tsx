"use client";

import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import type { Route } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/explorer/page-header";
import { RecordEmpty, RecordList, RecordRow, RecordSkeleton } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { ExchangeLogo } from "@/features/exchanges/exchange-logo";
import { useExchangeProfiles } from "@/features/profiles/use-profile";
import { exchangeBrandName, isExchangeActive } from "@/lib/exchanges/brands";
import type { PublicProfile } from "@/lib/profiles/types";

function groupExchanges(
  profiles: PublicProfile[],
): Array<{ name: string; profiles: PublicProfile[] }> {
  const groups = new Map<string, PublicProfile[]>();
  for (const profile of profiles) {
    if (!isExchangeActive(profile.displayName)) continue;
    const name = exchangeBrandName(profile.displayName);
    const group = groups.get(name);
    if (group) {
      group.push(profile);
    } else {
      groups.set(name, [profile]);
    }
  }
  return [...groups]
    .map(([name, grouped]) => ({ name, profiles: grouped }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function ExchangesPage() {
  const exchanges = useExchangeProfiles();
  const profiles = exchanges.data ?? [];
  const groups = groupExchanges(profiles);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="On-chain accounts of exchanges currently trading QUBIC."
        title="Exchanges"
      />

      {exchanges.isError ? (
        <ErrorState
          message={exchanges.error.message}
          onRetry={() => {
            exchanges.refetch();
          }}
        />
      ) : (
        <div className="rounded-2xl bg-surface p-1.5">
          {exchanges.isLoading ? (
            <RecordSkeleton rows={6} />
          ) : groups.length === 0 ? (
            <RecordEmpty>No active exchange accounts yet.</RecordEmpty>
          ) : (
            <div className="space-y-4 py-2">
              {groups.map((group) => (
                <section key={group.name}>
                  <div className="flex min-w-0 items-center gap-2 px-3 sm:px-4">
                    <ExchangeLogo className="size-5 shrink-0" name={group.name} />
                    <h2 className="truncate font-medium text-foreground text-sm">{group.name}</h2>
                    <span className="ml-auto shrink-0 text-[11px] text-muted">
                      {group.profiles.length} {group.profiles.length === 1 ? "account" : "accounts"}
                    </span>
                  </div>
                  <RecordList>
                    {group.profiles.map((profile) => (
                      <RecordRow key={profile.identity}>
                        <Link
                          className="flex min-w-0 items-center gap-3"
                          href={`/accounts/${profile.identity}` as Route}
                        >
                          <ExchangeLogo className="size-6 shrink-0" name={profile.displayName} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-foreground text-sm">
                              {profile.displayName}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">
                              {profile.identity}
                            </span>
                          </span>
                          <ArrowRightIcon className="size-4 shrink-0 text-muted" />
                        </Link>
                      </RecordRow>
                    ))}
                  </RecordList>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
