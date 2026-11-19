"use client";

import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { Home2Icon } from "@solar-icons/react/linear/home-2";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { formatInteger, shorten } from "@/lib/format";

import { activeFor, navigation, type NavigationItem } from "./navigation";

interface Crumb {
  current: boolean;
  href: string;
  icon: NavigationItem["icon"];
  label: string;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function detailLabel(pathname: string, item: NavigationItem): string | null {
  if (pathname === item.href) {
    return null;
  }
  const segment = pathname
    .slice(item.href.length + 1)
    .split("/")
    .filter(Boolean);
  const first = segment[0] ? decodeSegment(segment[0]) : "";

  switch (item.href) {
    case "/ticks": {
      const tick = Number(first);
      return Number.isFinite(tick) ? `Tick ${formatInteger(tick)}` : first;
    }
    case "/epochs": {
      const epoch = Number(first);
      return Number.isFinite(epoch) ? `Epoch ${formatInteger(epoch)}` : first;
    }
    case "/transactions":
      return first ? shorten(first, 8, 6) : null;
    case "/accounts":
      return first ? shorten(first, 8, 6) : null;
    case "/assets":
      return segment.length > 1 ? `Asset ${decodeSegment(segment[1] ?? "")}` : first || null;
    default:
      return first ? first.replaceAll("-", " ") : null;
  }
}

function crumbsFor(pathname: string): Crumb[] {
  const current = navigation.find((item) => activeFor(pathname, item.href));
  if (!current) {
    return [];
  }
  const detail = detailLabel(pathname, current);
  const crumbs: Crumb[] = [];

  if (pathname !== "/") {
    crumbs.push({
      current: false,
      href: "/",
      icon: Home2Icon,
      label: "Overview",
    });
  }

  crumbs.push({
    current: !detail,
    href: current.href,
    icon: current.icon,
    label: current.label,
  });

  if (detail) {
    crumbs.push({
      current: true,
      href: pathname,
      icon: current.icon,
      label: detail,
    });
  }

  return crumbs;
}

function widthFor(): string {
  return "max-w-[var(--page-max-width)]";
}

export function Breadcrumbs({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);

  return (
    <div
      className={inline ? "min-w-0 pb-3 xl:pb-0" : `mx-auto w-full ${widthFor()} px-4 pt-3 lg:px-8`}
    >
      <nav
        aria-label="Breadcrumb"
        className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
          {crumbs.map((crumb, index) => {
            const Icon = crumb.icon;
            const content = (
              <>
                <Icon className="size-3.5 shrink-0" />
                <span className="max-w-[14rem] truncate">{crumb.label}</span>
              </>
            );

            return (
              <li className="flex items-center gap-1.5" key={`${crumb.href}-${index}`}>
                {index > 0 ? <AltArrowRightIcon className="size-3 shrink-0 text-muted/35" /> : null}
                {crumb.current ? (
                  <span
                    aria-current="page"
                    className="flex items-center gap-1.5 font-medium text-foreground"
                  >
                    {content}
                  </span>
                ) : (
                  <Link
                    className="flex items-center gap-1.5 text-muted transition-colors hover:text-foreground"
                    href={crumb.href as Route}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
