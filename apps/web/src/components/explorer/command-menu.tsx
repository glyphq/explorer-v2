"use client";

import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { SearchResult } from "@/lib/api/generated/types.gen";
import { useSearch } from "@/lib/api/hooks";
import { shorten } from "@/lib/format";

import { activeFor, navigation } from "./navigation";

const HISTORY_KEY = "glyph:command-history";
const IDENTITY_PATTERN = /^[A-Z]{60}$/;

const typeLabels: Record<string, string> = {
  asset: "Asset",
  epoch: "Epoch",
  identity: "Account",
  tick: "Tick",
  transaction: "Transaction",
};

function routeForResult(result: SearchResult): Route | null {
  const value = result.value as Record<string, unknown>;
  switch (result.type) {
    case "tick": {
      const tick = value.tick;
      return typeof tick === "number" ? (`/ticks/${tick}` as Route) : null;
    }
    case "epoch": {
      const epoch = value.epoch;
      return typeof epoch === "number" ? (`/epochs/${epoch}` as Route) : null;
    }
    case "transaction": {
      const hash = value.hash;
      return typeof hash === "string" ? (`/transactions/${hash}` as Route) : null;
    }
    case "identity": {
      const identity = value.identity;
      return typeof identity === "string" ? (`/accounts/${identity}` as Route) : null;
    }
    case "asset": {
      const issuer = value.issuer;
      const name = value.name;
      return typeof issuer === "string" && typeof name === "string"
        ? (`/assets/${issuer}/${name}` as Route)
        : null;
    }
    default:
      return null;
  }
}

function labelForResult(result: SearchResult): string {
  const value = result.value as Record<string, unknown>;
  switch (result.type) {
    case "tick":
      return `Tick ${value.tick ?? ""}`;
    case "epoch":
      return `Epoch ${value.epoch ?? ""}`;
    case "transaction":
      return String(value.hash ?? "");
    case "identity":
      return String(value.identity ?? "");
    case "asset":
      return `${value.name ?? "Asset"} · ${shorten(String(value.issuer ?? ""))}`;
    default:
      return String(value);
  }
}

function labelForPath(path: string): string {
  const exact = navigation.find((item) => item.href === path);
  if (exact) {
    return exact.label;
  }
  const [root, segment] = path.split("/").filter(Boolean);
  switch (root) {
    case "ticks":
      return `Tick ${segment ?? ""}`;
    case "transactions":
      return `Transaction ${shorten(segment ?? "")}`;
    case "accounts":
      return `Account ${shorten(segment ?? "")}`;
    case "epochs":
      return `Epoch ${segment ?? ""}`;
    case "assets":
      return `Asset ${segment ?? ""}`;
    case "events":
      return "Events";
    default:
      return path;
  }
}

function directIdentity(query: string): string | null {
  const value = query.replace(/\s/g, "").toUpperCase();
  return IDENTITY_PATTERN.test(value) ? value : null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function CommandMenuButton({
  compact = false,
  onClick,
}: {
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-9 w-full items-center gap-2 rounded-lg bg-surface-secondary px-3 text-left text-muted text-xs transition-colors hover:bg-surface-tertiary hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      <MagnifierIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {compact ? "Search or jump to" : "Search ticks, accounts, or jump to"}
      </span>
      {compact ? null : (
        <kbd className="rounded-[4px] bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted">
          ⌘K
        </kbd>
      )}
    </button>
  );
}

export function CommandMenu({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const { data, isFetching } = useSearch(query.trim());
  const results = data?.data ?? [];
  const identity = directIdentity(query);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        setHistory(stored.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      // Local history is optional.
    }
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }
    setHistory((previous) => {
      const next = [pathname, ...previous.filter((path) => path !== pathname)].slice(0, 8);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Ignore private-mode storage failures.
      }
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [onOpenChange, open]);

  const run = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(path as Route);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={() => onOpenChange(false)}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            animate={{ filter: "blur(0px)", opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[640px] overflow-hidden rounded-2xl bg-overlay text-foreground shadow-overlay"
            exit={{ filter: "blur(6px)", opacity: 0, scale: 0.97, y: -10 }}
            initial={{ filter: "blur(10px)", opacity: 0, scale: 0.96, y: -18 }}
            onMouseDown={(event) => event.stopPropagation()}
            transition={{
              damping: 30,
              mass: 0.7,
              stiffness: 360,
              type: "spring",
            }}
          >
            <Command label="Command menu" loop>
              <div className="flex items-center gap-3 px-4 py-3">
                <MagnifierIcon className="size-4 shrink-0 text-muted" />
                <Command.Input
                  autoFocus
                  className="h-8 w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted"
                  onValueChange={setQuery}
                  placeholder="Search ticks, transactions, accounts, or jump to a page"
                  value={query}
                />
                <kbd className="shrink-0 rounded-[4px] bg-surface-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted">
                  esc
                </kbd>
              </div>

              <Command.List className="max-h-[440px] overflow-y-auto overscroll-contain p-2">
                <Command.Empty className="px-3 py-10 text-center text-muted text-sm">
                  No results for “{query}”.
                </Command.Empty>

                {identity ? (
                  <Command.Group
                    className="mb-1"
                    heading={
                      <span className="block px-2 py-1.5 font-medium text-[10px] text-muted uppercase tracking-[0.16em]">
                        Open account
                      </span>
                    }
                  >
                    <Command.Item
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-muted text-sm data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                      onSelect={() => run(`/accounts/${identity}` as Route)}
                      value={`account ${identity} ${query}`}
                    >
                      <UsersGroupRoundedIcon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={identity}>
                        {identity}
                      </span>
                      <span className="shrink-0 text-[9px] text-muted uppercase tracking-[0.14em]">
                        Account
                      </span>
                    </Command.Item>
                  </Command.Group>
                ) : null}

                {history.length > 0 ? (
                  <Command.Group
                    className="mb-1"
                    heading={
                      <span className="block px-2 py-1.5 font-medium text-[10px] text-muted uppercase tracking-[0.16em]">
                        Recent
                      </span>
                    }
                  >
                    {history.map((path) => (
                      <Command.Item
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-muted text-sm data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                        key={path}
                        onSelect={() => run(path)}
                        value={`recent ${labelForPath(path)} ${path}`}
                      >
                        <ClockCircleIcon className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{labelForPath(path)}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted">{path}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                <Command.Group
                  heading={
                    <span className="block px-2 py-1.5 font-medium text-[10px] text-muted uppercase tracking-[0.16em]">
                      Navigate
                    </span>
                  }
                >
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const current = activeFor(pathname ?? "", item.href);
                    return (
                      <Command.Item
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-muted text-sm data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                        key={item.href}
                        onSelect={() => run(item.href)}
                        value={`${item.label} ${item.href}`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {current ? (
                          <span className="font-mono text-[9px] text-muted uppercase tracking-[0.14em]">
                            current
                          </span>
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {query.trim().length >= 3 ? (
                  <Command.Group
                    heading={
                      <span className="block px-2 py-1.5 font-medium text-[10px] text-muted uppercase tracking-[0.16em]">
                        Index search
                      </span>
                    }
                  >
                    {isFetching ? (
                      <Command.Loading className="px-3 py-2 text-muted text-xs">
                        Searching the index…
                      </Command.Loading>
                    ) : null}
                    {results.map((result, index) => {
                      if (identity && result.type === "identity") {
                        const value = result.value as Record<string, unknown>;
                        if (String(value.identity ?? "").toUpperCase() === identity) {
                          return null;
                        }
                      }
                      const route = routeForResult(result);
                      if (!route) {
                        return null;
                      }
                      return (
                        <Command.Item
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-muted text-sm data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                          key={`${result.type}-${index}`}
                          onSelect={() => run(route)}
                          value={`${result.type} ${labelForResult(result)} ${route}`}
                        >
                          <MagnifierIcon className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">
                            {labelForResult(result)}
                          </span>
                          <span className="shrink-0 text-[9px] text-muted uppercase tracking-[0.14em]">
                            {typeLabels[result.type] ?? result.type}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ) : null}
              </Command.List>

              <div className="flex items-center justify-between gap-4 bg-surface-secondary/50 px-4 py-2 text-[10px] text-muted">
                <span>↑↓ navigate · ↵ open · cmd+k toggle</span>
                <span>esc close</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
