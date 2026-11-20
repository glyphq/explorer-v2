"use client";

import { AltArrowLeftIcon } from "@solar-icons/react/linear/alt-arrow-left";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { CloseIcon } from "@solar-icons/react/linear/close";
import { HamburgerMenuIcon } from "@solar-icons/react/linear/hamburger-menu";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import { AsciiReveal } from "ascii-reveal";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { GlyphMark } from "@/components/glyph-mark";
import { ModeToggle } from "@/components/mode-toggle";
import { useMarket } from "@/lib/api/hooks";
import { LiveStreamProvider } from "@/lib/api/live-stream";
import { classNames } from "@/lib/format";

import { Breadcrumbs } from "./breadcrumbs";
import { CommandMenu } from "./command-menu";
import {
  activeFor,
  buildNavigation,
  chainNavigation,
  dataNavigation,
  type NavigationItem,
  primaryNavigation,
  resourceNavigation,
} from "./navigation";

const perBillionFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  minimumIntegerDigits: 3,
});
const SIDEBAR_KEY = "glyph:sidebar-collapsed";

function formatPerBillion(value: number | null): string {
  return value === null ? "$—/B" : `$${perBillionFormatter.format(value)}/B`;
}

function Brand({ flush = false, onClick }: { flush?: boolean; onClick?: () => void }) {
  return (
    <Link
      aria-label="Glyph explorer home"
      className={classNames("flex shrink-0 items-center gap-2.5", !flush && "pl-1.5")}
      href="/"
      onClick={onClick}
    >
      <GlyphMark className="size-7" priority />
      <span className="font-semibold text-[15px] text-foreground tracking-tight">
        Glyph <span className="font-normal text-muted">Explorer</span>
      </span>
    </Link>
  );
}

function SidebarLink({
  collapsed,
  items,
  pathname,
}: {
  collapsed: boolean;
  items: readonly NavigationItem[];
  pathname: string;
}) {
  return (
    <>
      {items.map((item) => {
        const active = activeFor(pathname, item.href);
        const Icon = item.icon;
        const external = "external" in item && item.external === true;
        const content = (
          <>
            <Icon className="size-4 shrink-0" />
            {collapsed ? null : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {!collapsed && external ? (
              <ArrowRightUpIcon className="size-3.5 shrink-0 text-muted" />
            ) : null}
          </>
        );
        const itemClass = classNames(
          "flex items-center rounded-lg text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
          collapsed ? "mx-auto size-10 justify-center" : "h-9 gap-2.5 px-2.5",
          active
            ? "bg-surface-secondary text-foreground"
            : "text-muted hover:bg-surface-secondary/60 hover:text-foreground",
        );
        const title = collapsed ? item.label : undefined;

        return external ? (
          <a
            aria-label={title}
            className={itemClass}
            href={item.href}
            key={item.href}
            rel="noreferrer"
            target="_blank"
            title={title}
          >
            {content}
          </a>
        ) : (
          <Link
            aria-current={active ? "page" : undefined}
            aria-label={title}
            className={itemClass}
            href={item.href as Route}
            key={item.href}
            title={title}
          >
            {content}
          </Link>
        );
      })}
    </>
  );
}

function SidebarGroup({
  collapsed,
  items,
  pathname,
  title,
}: {
  collapsed: boolean;
  items: readonly NavigationItem[];
  pathname: string;
  title: string;
}) {
  return (
    <section>
      {collapsed ? null : (
        <p className="px-2 text-[10px] text-muted uppercase tracking-[0.16em]">{title}</p>
      )}
      <div className={classNames("grid gap-0.5", collapsed ? null : "mt-1.5")}>
        <SidebarLink collapsed={collapsed} items={items} pathname={pathname} />
      </div>
    </section>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  pathname,
}: {
  collapsed: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  return (
    <aside
      className={classNames(
        "sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-out xl:flex",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
      id="app-sidebar"
    >
      <div className="flex h-16 shrink-0 items-center px-4">
        {collapsed ? (
          <Link aria-label="Glyph explorer home" className="flex items-center pl-1.5" href="/">
            <GlyphMark className="size-7" priority />
          </Link>
        ) : (
          <Brand />
        )}
      </div>

      <div
        className={classNames(
          "flex-1 overflow-y-auto overscroll-contain py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <nav aria-label="Primary" className="grid gap-5">
          <SidebarGroup
            collapsed={collapsed}
            items={primaryNavigation}
            pathname={pathname}
            title="Explore"
          />
          <SidebarGroup
            collapsed={collapsed}
            items={chainNavigation}
            pathname={pathname}
            title="Chain"
          />
          <SidebarGroup
            collapsed={collapsed}
            items={dataNavigation}
            pathname={pathname}
            title="Data"
          />
          <SidebarGroup
            collapsed={collapsed}
            items={buildNavigation}
            pathname={pathname}
            title="Build"
          />
          <SidebarGroup
            collapsed={collapsed}
            items={resourceNavigation}
            pathname={pathname}
            title="Resources"
          />
        </nav>
      </div>

      <div className={classNames("mt-auto shrink-0 pb-16", collapsed ? "px-2" : "px-3")}>
        <button
          aria-controls="app-sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={classNames(
            "flex items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
            collapsed ? "mx-auto size-10 justify-center" : "h-9 w-full gap-2.5 px-2.5 text-[13px]",
          )}
          onClick={onToggle}
          type="button"
        >
          {collapsed ? (
            <AltArrowRightIcon className="size-4" />
          ) : (
            <AltArrowLeftIcon className="size-4" />
          )}
          {collapsed ? null : <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function MobileGroup({
  items,
  onClose,
  pathname,
  title,
}: {
  items: readonly NavigationItem[];
  onClose: () => void;
  pathname: string;
  title: string;
}) {
  return (
    <section>
      <p className="px-1 text-[10px] text-muted uppercase tracking-[0.16em]">{title}</p>
      <div className="mt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeFor(pathname, item.href);
          const external = "external" in item && item.external === true;
          const content = (
            <>
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {external ? (
                <ArrowRightUpIcon className="size-4 shrink-0 text-muted" />
              ) : active ? (
                <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
              ) : null}
            </>
          );
          const itemClass = classNames(
            "flex h-11 items-center gap-3 text-[15px] transition-colors",
            active ? "text-foreground" : "text-muted hover:text-foreground",
          );

          return external ? (
            <a
              className={itemClass}
              href={item.href}
              key={item.href}
              onClick={onClose}
              rel="noreferrer"
              target="_blank"
            >
              {content}
            </a>
          ) : (
            <Link className={itemClass} href={item.href as Route} key={item.href} onClick={onClose}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MobileMenu({
  onClose,
  onSearch,
  open,
  pathname,
}: {
  onClose: () => void;
  onSearch: () => void;
  open: boolean;
  pathname: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1280px)");
    const onDesktop = () => {
      if (desktop.matches) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      aria-label="Navigation"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background xl:hidden"
      exit={reduceMotion ? { opacity: 0 } : { opacity: 1, x: "100%" }}
      id="mobile-navigation"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 1, x: "100%" }}
      ref={panelRef}
      role="dialog"
      transition={reduceMotion ? { duration: 0.12 } : { duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center justify-between px-4">
          <Brand onClick={onClose} />
          <button
            aria-label="Close navigation"
            className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-foreground/10 bg-surface-secondary/40 px-3.5 text-muted text-sm transition-colors hover:border-foreground/20 hover:text-foreground"
          onClick={() => {
            onClose();
            onSearch();
          }}
          type="button"
        >
          <MagnifierIcon className="size-4" />
          <span>Search ticks, accounts, assets</span>
        </button>

        <nav aria-label="Mobile" className="mt-6 grid gap-5">
          <MobileGroup
            items={primaryNavigation}
            onClose={onClose}
            pathname={pathname}
            title="Explore"
          />
          <MobileGroup
            items={chainNavigation}
            onClose={onClose}
            pathname={pathname}
            title="Chain"
          />
          <MobileGroup items={dataNavigation} onClose={onClose} pathname={pathname} title="Data" />
          <MobileGroup
            items={buildNavigation}
            onClose={onClose}
            pathname={pathname}
            title="Build"
          />
          <MobileGroup
            items={resourceNavigation}
            onClose={onClose}
            pathname={pathname}
            title="Resources"
          />
        </nav>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[10px] text-muted uppercase tracking-[0.16em]">Appearance</span>
          <ModeToggle />
        </div>
      </div>
    </motion.div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const market = useMarket();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const price = market.data?.data?.price_usd;
  const pricePerBillion =
    typeof price === "number" && Number.isFinite(price) ? price * 1_000_000_000 : null;

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openSearch = useCallback(() => setCommandOpen(true), []);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // Sidebar preference is optional.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // Ignore private-mode storage failures.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    contentRef.current?.scrollTo({ left: 0, top: 0 });
  }, [pathname]);

  return (
    <LiveStreamProvider>
      <div className="flex h-svh overflow-hidden bg-background">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:font-medium focus:text-background focus:text-sm"
          href="#main"
        >
          Skip to content
        </a>

        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} pathname={pathname} />

        <div className="flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-40 shrink-0 bg-background/85 backdrop-blur-xl">
            <div className="page-width flex h-16 items-center px-4 lg:px-8">
              <div className="xl:hidden">
                <Brand flush />
              </div>

              <div className="hidden min-w-0 flex-1 pr-4 xl:block">
                <Breadcrumbs inline />
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                <span
                  aria-label={
                    pricePerBillion === null
                      ? "Qubic price per billion unavailable"
                      : `Qubic price per billion ${formatPerBillion(pricePerBillion)}`
                  }
                  className="min-w-[4.5rem] px-1.5 text-right font-medium text-foreground text-xs tabular-nums"
                  title="Qubic price per billion"
                >
                  {formatPerBillion(pricePerBillion)}
                </span>

                <button
                  aria-keyshortcuts="Meta+K Control+K"
                  className="hidden h-9 items-center gap-2 rounded-full border border-foreground/10 bg-background/30 px-3 text-muted text-xs transition-colors hover:border-foreground/20 hover:bg-surface-secondary hover:text-foreground xl:flex"
                  onClick={openSearch}
                  type="button"
                >
                  <MagnifierIcon className="size-3.5" />
                  <span>Search</span>
                  <kbd className="rounded-full border border-foreground/10 px-1.5 py-0.5 font-mono text-[9px] text-muted">
                    ⌘K
                  </kbd>
                </button>

                <button
                  aria-label="Search"
                  className="hidden size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground min-[360px]:flex xl:hidden"
                  onClick={openSearch}
                  type="button"
                >
                  <MagnifierIcon className="size-4" />
                </button>

                <div className="hidden md:block">
                  <ModeToggle />
                </div>

                <button
                  aria-controls="mobile-navigation"
                  aria-expanded={mobileOpen}
                  aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                  className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground xl:hidden"
                  onClick={() => setMobileOpen((value) => !value)}
                  type="button"
                >
                  {mobileOpen ? (
                    <CloseIcon className="size-5" />
                  ) : (
                    <HamburgerMenuIcon className="size-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="page-width px-4 xl:hidden">
              <Breadcrumbs inline />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface/50 xl:rounded-tl-[28px]">
            <div
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
              ref={contentRef}
            >
              <main className="flex-1" id="main" tabIndex={-1}>
                {pathname === "/" || pathname === "/bpp9000" ? (
                  children
                ) : (
                  <AsciiReveal
                    as="div"
                    duration="fast"
                    key={pathname}
                    origin={pathname.startsWith("/accounts/") ? "center" : "top-left"}
                    preset="dither"
                    revealOnHydrate
                  >
                    {children}
                  </AsciiReveal>
                )}
              </main>

              <footer className="shrink-0">
                <div className="page-width flex flex-col gap-3 px-4 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
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
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <MobileMenu
              onClose={closeMobile}
              onSearch={openSearch}
              open={mobileOpen}
              pathname={pathname}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <CommandMenu onOpenChange={setCommandOpen} open={commandOpen} />
    </LiveStreamProvider>
  );
}
