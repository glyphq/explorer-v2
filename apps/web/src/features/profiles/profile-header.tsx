import type { ReactNode } from "react";

import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { ExchangeListingNotice } from "@/features/exchanges/exchange-logo";
import { isExchangeDelisted } from "@/lib/exchanges/brands";
import { classNames, shorten } from "@/lib/format";
import { SOCIAL_LABELS } from "@/lib/profiles/socials";
import type { PublicProfile } from "@/lib/profiles/types";
import { SOCIAL_PLATFORMS } from "@/lib/profiles/types";

import { ProfileVerificationBadge } from "./profile-badge";
import { formatWebsiteLabel, profileWebsiteHref } from "./profile-format";
import { ProfileSocialIcon, type ProfileLinkKind } from "./social-icons";

type ProfileLink = {
  href: string;
  kind: ProfileLinkKind;
  label: string;
};

function socialLinks(profile: PublicProfile): ProfileLink[] {
  const links: ProfileLink[] = [];
  for (const platform of SOCIAL_PLATFORMS) {
    const href = profile.socials[platform];
    if (href) {
      links.push({ href, kind: platform, label: SOCIAL_LABELS[platform] });
    }
  }

  const websiteHref = profileWebsiteHref(profile.website);
  if (websiteHref && profile.website) {
    links.push({
      href: websiteHref,
      kind: "website",
      label: formatWebsiteLabel(profile.website),
    });
  }
  return links;
}

export function ProfileSocialLinks({
  align = "center",
  className,
  profile,
}: {
  align?: "center" | "start";
  className?: string;
  profile: PublicProfile;
}) {
  const links = socialLinks(profile);
  if (links.length === 0) {
    return null;
  }

  return (
    <div
      className={classNames(
        "flex flex-wrap items-center gap-2",
        align === "center" ? "justify-center" : "justify-start",
        className,
      )}
    >
      {links.map((link) => (
        <a
          aria-label={link.label}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background/60 text-muted transition-colors duration-150 hover:border-border-secondary hover:bg-surface-secondary hover:text-foreground"
          href={link.href}
          key={link.kind}
          rel="me nofollow ugc noreferrer noopener"
          target="_blank"
          title={link.label}
        >
          <ProfileSocialIcon className="size-4" kind={link.kind} />
        </a>
      ))}
    </div>
  );
}

/**
 * Centered profile hero for a profile-backed identity. Account stats are passed
 * as children so the profile and financial summary stay one composition.
 */
export function ProfileHeader({
  avatar,
  children,
  identity,
  profile,
}: {
  avatar?: ReactNode;
  children?: ReactNode;
  identity: string;
  profile: PublicProfile;
}) {
  return (
    <div>
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-2 text-center">
        <span className="inline-flex rounded-full bg-background p-1.5 ring-1 ring-border">
          {avatar ?? <IdentityAvatar size={112} value={identity} />}
        </span>
        <div className="mt-4 flex min-w-0 flex-col items-center gap-1.5">
          <h1 className="min-w-0 break-words font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
            {profile.displayName}
          </h1>
          {profile.kind === "exchange" && isExchangeDelisted(profile.displayName) ? (
            <ExchangeListingNotice name={profile.displayName} />
          ) : (
            <ProfileVerificationBadge profile={profile} />
          )}
        </div>
        <span
          className="mt-2 inline-flex max-w-full items-center rounded-full border border-border/80 bg-background/50 px-3 py-1 font-mono text-[11px] text-muted"
          title={identity}
        >
          <span className="hidden sm:inline">{identity}</span>
          <span className="sm:hidden">{shorten(identity, 4, 4)}</span>
        </span>
        {profile.bio ? (
          <p className="mt-4 max-w-xl whitespace-pre-line break-words text-pretty text-foreground/80 text-sm leading-relaxed">
            {profile.bio}
          </p>
        ) : null}
        <ProfileSocialLinks className="mt-5" profile={profile} />
      </div>
      {children ? <div className="mx-auto mt-8 max-w-3xl">{children}</div> : null}
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
      <ProfileSocialLinks align="start" className="mt-2" profile={profile} />
    </div>
  );
}
