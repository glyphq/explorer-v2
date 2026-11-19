"use client";

import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GlyphMark } from "@/components/glyph-mark";
import { ModeToggle } from "@/components/mode-toggle";
import { LiveStreamProvider } from "@/lib/api/live-stream";

import { CommandMenu, CommandMenuButton } from "./command-menu";
import { activeFor, navigation, sectionFor } from "./navigation";

function SidebarTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="group relative flex">
      {children}
      <span
        className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 font-medium text-background text-xs opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const section = sectionFor(pathname);

  return (
    <LiveStreamProvider>
      <div className="min-h-svh bg-background">
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col items-center bg-background md:flex">
          <Link
            aria-label="Glyph explorer home"
            className="mt-4 flex size-11 items-center justify-center rounded-xl"
            href="/"
          >
            <GlyphMark className="size-8" priority />
          </Link>

          <nav aria-label="Primary" className="mt-8 flex flex-1 flex-col items-center gap-2">
            {navigation.map((item) => {
              const active = activeFor(pathname, item.href);
              const Icon = item.icon;
              return (
                <SidebarTooltip key={item.href} label={item.label}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={[
                      "relative flex size-11 items-center justify-center rounded-xl transition-colors",
                      active
                        ? "bg-surface-secondary text-foreground"
                        : "text-muted hover:bg-surface-secondary hover:text-foreground",
                    ].join(" ")}
                    href={item.href}
                  >
                    {active ? (
                      <span className="absolute inset-y-3 -left-[13px] w-0.5 rounded-full bg-foreground" />
                    ) : null}
                    <Icon className="size-5" />
                  </Link>
                </SidebarTooltip>
              );
            })}
          </nav>

          <div className="mb-4 flex flex-col items-center gap-2">
            <SidebarTooltip label="API status">
              <a
                aria-label="Open the Glyph API status page"
                className="flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                href="https://api.glyphq.org/status"
                rel="noreferrer"
                target="_blank"
              >
                <ArrowRightUpIcon className="size-5" />
              </a>
            </SidebarTooltip>
            <SidebarTooltip label="Switch theme">
              <ModeToggle />
            </SidebarTooltip>
          </div>
        </aside>

        <div className="flex min-h-svh flex-col md:pl-[72px]">
          <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl">
            <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
              <Link className="flex items-center gap-2 md:hidden" href="/">
                <GlyphMark className="size-6" />
                <span className="font-semibold text-xs tracking-[0.18em]">GLYPH</span>
              </Link>

              <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm sm:flex">
                <span className="text-muted">Explorers</span>
                <AltArrowRightIcon className="size-3 text-muted" />
                <span className="text-muted">Qubic</span>
                <AltArrowRightIcon className="size-3 text-muted" />
                <span className="font-medium text-foreground">{section}</span>
              </nav>

              <div className="ml-auto hidden w-full max-w-sm lg:block">
                <CommandMenuButton onClick={() => setCommandOpen(true)} />
              </div>

              <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:hidden">
                <ModeToggle />
              </div>
            </div>

            <div className="px-4 pb-3 lg:hidden">
              <CommandMenuButton compact onClick={() => setCommandOpen(true)} />
            </div>
          </div>

          <main className="flex-1 pb-16 md:pb-0" id="main">
            {children}
          </main>

          <footer>
            <div className="flex flex-col gap-3 px-4 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
              <span>Glyph explorer · direct-peer Qubic index</span>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  className="transition-colors hover:text-foreground"
                  href="https://api.glyphq.org/openapi.json"
                  rel="noreferrer"
                  target="_blank"
                >
                  OpenAPI
                </a>
                <a
                  className="transition-colors hover:text-foreground"
                  href="https://api.glyphq.org/status"
                  rel="noreferrer"
                  target="_blank"
                >
                  Indexer status
                </a>
                <span>Amounts are integer QU · timestamps UTC</span>
              </div>
            </div>
          </footer>
        </div>

        <nav
          aria-label="Explorer sections"
          className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around bg-surface/95 px-2 py-2 backdrop-blur md:hidden"
        >
          {navigation.map((item) => {
            const active = activeFor(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={[
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-surface-secondary text-foreground"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                <Icon className="size-5" />
              </Link>
            );
          })}
        </nav>
      </div>
      <CommandMenu onOpenChange={setCommandOpen} open={commandOpen} />
    </LiveStreamProvider>
  );
}
