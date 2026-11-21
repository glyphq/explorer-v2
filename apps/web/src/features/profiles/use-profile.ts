"use client";

import { useQuery } from "@tanstack/react-query";

import type { PublicProfile } from "@/lib/profiles/types";

import { fetchKnownProfiles, fetchProfile, type ProfileRequestError } from "./api";

export const profileQueryKey = (identity: string) => ["profile", identity] as const;
export const knownProfilesQueryKey = ["profiles", "known"] as const;

/**
 * Public profile for an account. A successful `null` means the identity has no
 * profile. An unavailable profile service surfaces as a `ProfileRequestError`
 * with code `profile_unavailable` so the page can fail quietly.
 */
export function useProfile(identity: string, initialProfile?: PublicProfile | null) {
  return useQuery<PublicProfile | null, ProfileRequestError>({
    enabled: Boolean(identity),
    initialData: initialProfile,
    queryFn: ({ signal }) => fetchProfile(identity, signal),
    queryKey: profileQueryKey(identity),
    retry: (failureCount, error) => {
      if (
        error.code === "profile_unavailable" ||
        error.code === "invalid_response" ||
        error.code === "network"
      ) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 60_000,
  });
}

export function useKnownProfiles() {
  return useQuery<PublicProfile[], ProfileRequestError>({
    queryFn: ({ signal }) => fetchKnownProfiles(signal),
    queryKey: knownProfilesQueryKey,
    retry: (failureCount, error) => {
      if (
        error.code === "profile_unavailable" ||
        error.code === "invalid_response" ||
        error.code === "network"
      ) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 60_000,
  });
}
