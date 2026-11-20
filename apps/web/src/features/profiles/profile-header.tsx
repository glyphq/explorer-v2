import { LinkIcon } from "@solar-icons/react/linear/link";
import { classNames } from "@/lib/format";
import type { PublicProfile } from "@/lib/profiles/types";
import { ProfileVerificationBadge } from "./profile-badge";
import { formatWebsiteLabel, profileWebsiteHref } from "./profile-format";

export function ProfileWebsiteLink({
  className,
  website,
}: {
  className?: string;
  website: string | undefined;
}) {
  const href = profileWebsiteHref(website);
  if (!(href && website)) {
    return null;
  }
  return (
    <a
      className={classNames(
        "inline-flex max-w-full items-center gap-1.5 text-foreground/80 text-xs underline-offset-4 transition-colors hover:text-foreground hover:underline",
        className,
      )}
      href={href}
      rel="nofollow ugc noreferrer noopener"
      target="_blank"
    >
      <LinkIcon className="size-3.5 shrink-0" />
      <span className="truncate">{formatWebsiteLabel(website)}</span>
    </a>
  );
}

/**
 * Primary account header for a profile-backed identity. The avatar is rendered
 * by the account page so this stays a compact metadata block.
 */
export function ProfileHeader({ identity, profile }: { identity: string; profile: PublicProfile }) {
  return (
    <div className="min-w-0 max-w-2xl">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 break-words font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
          {profile.displayName}
        </h1>
        <ProfileVerificationBadge profile={profile} />
      </div>
      <p className="mt-1.5 select-all break-all font-mono text-[11px] text-muted" title={identity}>
        {identity}
      </p>
      {profile.bio ? (
        <p className="mt-3 max-w-prose whitespace-pre-line break-words text-foreground/85 text-sm leading-relaxed">
          {profile.bio}
        </p>
      ) : null}
      <ProfileWebsiteLink className="mt-3" website={profile.website} />
    </div>
  );
}

/**
 * Additional profile metadata for an identity whose primary header must stay
 * intact, such as a smart contract address.
 */
export function ProfileMeta({ profile }: { profile: PublicProfile }) {
  return (
    <div className="mt-3 min-w-0 max-w-2xl">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-muted">Profile</span>
        <span className="min-w-0 break-words font-medium text-foreground">
          {profile.displayName}
        </span>
        <ProfileVerificationBadge profile={profile} />
      </div>
      {profile.bio ? (
        <p className="mt-1.5 whitespace-pre-line break-words text-foreground/80 text-xs leading-relaxed">
          {profile.bio}
        </p>
      ) : null}
      <ProfileWebsiteLink className="mt-1.5" website={profile.website} />
    </div>
  );
}
