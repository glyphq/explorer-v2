"use client";

import { Command } from "cmdk";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useRouteTransition } from "@/components/route-transition";
import { UiIcon } from "@/components/ui-icon";
import type { SearchResult } from "@/lib/api/generated/types.gen";
import { useSearch } from "@/lib/api/hooks";
import { shorten } from "@/lib/format";
import { ContractMark } from "./contract-mark";
import { useContract } from "./contract-provider";
import { activeFor, navigation } from "./navigation";

const HISTORY_KEY = "glyph:command-history";
const IDENTITY_PATTERN = /^[A-Z]{60}$/;
const TRANSACTION_PATTERN = /^[a-z]{60}$/;

const typeLabels: Record<string, string> = {
  epoch: "Epoch",
  identity: "Identity",
  tick: "Tick",
  transaction: "Transaction",
};

function resultValue(result: SearchResult): Record<string, unknown> | null {
  if (!result.value || typeof result.value !== "object") {
    return null;
  }
  return result.value as Record<string, unknown>;
}

function routeForResult(result: SearchResult): Route | null {
  const value = resultValue(result);
  if (!value) {
    return null;
  }
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
    default:
      return null;
  }
}

function labelForResult(result: SearchResult): string {
  const value = resultValue(result);
  if (!value) {
    return typeLabels[result.type] ?? result.type;
  }
  switch (result.type) {
    case "tick":
      return `Tick ${value.tick ?? ""}`;
    case "epoch":
      return `Epoch ${value.epoch ?? ""}`;
    case "transaction":
      return String(value.hash ?? "");
    case "identity":
      return String(value.identity ?? "");
    default:
      return String(value);
  }
}

function labelForPath(path: string): string {
  const exact = navigation.find((item) => item.href === path);
  if (exact) {
    return exact.label;
  }
  const [root, segment, third] = path.split("/").filter(Boolean);
  switch (root) {
    case "ticks":
      return `Tick ${segment ?? ""}`;
    case "transactions":
      return `Transaction ${shorten(segment ?? "")}`;
    case "accounts":
      return `Identity ${shorten(segment ?? "", 4, 4)}`;
    case "epochs":
      return `Epoch ${segment ?? ""}`;
    case "contracts":
      return segment ? `Contract ${segment.toUpperCase()}` : "Contracts";
    case "proposals":
      return segment
        ? `Proposal ${segment.toUpperCase()}${third ? ` #${third}` : ""}`
        : "Proposals";
    case "events":
      return "Events";
    default:
      return path;
  }
}

function directAccount(query: string): string | null {
  const value = query.replace(/\s/g, "");
  return IDENTITY_PATTERN.test(value) ? value : null;
}

function directTransaction(query: string): string | null {
  const value = query.replace(/\s/g, "");
  return TRANSACTION_PATTERN.test(value) ? value : null;
}

function SearchResultRow({
  onSelect,
  result,
  skipIdentity,
  skipTransaction,
}: {
  onSelect: (path: string) => void;
  result: SearchResult;
  skipIdentity: string | null;
  skipTransaction: string | null;
}) {
  const value = resultValue(result);
  const rawIdentity =
    result.type === "identity" && typeof value?.identity === "string" ? value.identity : null;
  const rawTransaction =
    result.type === "transaction" && typeof value?.hash === "string" ? value.hash : null;
  const contract = useContract(rawIdentity);

  if (rawIdentity && skipIdentity && rawIdentity.toUpperCase() === skipIdentity) {
    return null;
  }
  if (rawTransaction && skipTransaction && rawTransaction.toLowerCase() === skipTransaction) {
    return null;
  }

  const route = contract
    ? (`/contracts/${contract.name.toLowerCase()}` as Route)
    : routeForResult(result);
  if (!route) {
    return null;
  }

  return (
    <Command.Item
      className="flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-2 font-mono text-[12px] text-muted data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
      onSelect={() => onSelect(route)}
      value={`${result.type} ${contract?.name ?? labelForResult(result)} ${route}`}
    >
      {contract ? (
        <ContractMark name={contract.name} size={18} />
      ) : (
        <UiIcon className="size-4 shrink-0" name="search" />
      )}
      <span
        className={
          contract ? "min-w-0 flex-1 truncate text-xs" : "min-w-0 flex-1 truncate font-mono text-xs"
        }
        title={rawIdentity ?? undefined}
      >
        {contract?.name ?? labelForResult(result)}
      </span>
      <span className="shrink-0 font-mono text-[9px] text-muted tracking-[0.04em]">
        {contract ? "Contract" : (typeLabels[result.type] ?? result.type)}
      </span>
    </Command.Item>
  );
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

export function CommandMenu({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const pathname = usePathname();
  const { navigate } = useRouteTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const { data, isFetching } = useSearch(query.trim());
  const results = (data?.data ?? []).filter((result) => result.type !== "asset");
  const account = directAccount(query);
  const transaction = directTransaction(query);
  const directContract = useContract(account);

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
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!(first && last)) {
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
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onOpenChange, open]);

  const run = (path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(path);
  };

  return (
    <LayoutGroup id="command-menu">
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/65 p-4 pt-[10dvh] backdrop-blur-[8px]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="overlay"
            onMouseDown={() => onOpenChange(false)}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              animate={{ opacity: 1 }}
              aria-label="Command menu"
              aria-modal="true"
              className="corner-frame corner-frame-card w-full max-w-2xl rounded-[10px] bg-transparent p-1.5 text-foreground shadow-2xl shadow-black/50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              layoutId="command-surface"
              onMouseDown={(event) => event.stopPropagation()}
              ref={panelRef}
              role="dialog"
              transition={{
                damping: 34,
                mass: 0.7,
                stiffness: 360,
                type: "spring",
              }}
            >
              <div className="overflow-hidden rounded-[7px] bg-surface">
                <Command label="Command menu" loop>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <UiIcon className="size-4 shrink-0 text-muted" name="search" />
                    <Command.Input
                      autoFocus
                      className="h-8 w-full bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-muted"
                      onValueChange={setQuery}
                      placeholder="Search ticks, transactions, identities, or jump to a page"
                      value={query}
                    />
                    <kbd className="shrink-0 rounded-[2px] bg-surface-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted">
                      esc
                    </kbd>
                  </div>

                  <Command.List className="max-h-[440px] overflow-y-auto overscroll-contain p-2">
                    <Command.Empty className="px-3 py-10 text-center text-muted text-sm">
                      No results for “{query}”.
                    </Command.Empty>

                    {transaction ? (
                      <Command.Group
                        className="mb-1"
                        heading={
                          <span className="block px-2 py-1.5 font-mono text-[10px] text-muted tracking-[0.04em]">
                            Open transaction
                          </span>
                        }
                      >
                        <Command.Item
                          className="flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-2 font-mono text-[12px] text-muted data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                          onSelect={() => run(`/transactions/${transaction}` as Route)}
                          value={`transaction ${transaction} ${query}`}
                        >
                          <UiIcon className="size-4 shrink-0" name="document" />
                          <span
                            className="min-w-0 flex-1 truncate font-mono text-xs"
                            title={transaction}
                          >
                            {transaction}
                          </span>
                          <span className="shrink-0 font-mono text-[9px] text-muted tracking-[0.04em]">
                            Transaction
                          </span>
                        </Command.Item>
                      </Command.Group>
                    ) : null}

                    {account ? (
                      <Command.Group
                        className="mb-1"
                        heading={
                          <span className="block px-2 py-1.5 font-mono text-[10px] text-faint tracking-[0.04em]">
                            Open identity
                          </span>
                        }
                      >
                        <Command.Item
                          className="flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-2 font-mono text-[12px] text-muted data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                          onSelect={() =>
                            run(
                              directContract
                                ? (`/contracts/${directContract.name.toLowerCase()}` as Route)
                                : (`/accounts/${account}` as Route),
                            )
                          }
                          value={`${directContract ? "contract" : "identity"} ${directContract?.name ?? account} ${query}`}
                        >
                          {directContract ? (
                            <ContractMark name={directContract.name} size={18} />
                          ) : (
                            <UiIcon className="size-4 shrink-0" name="users" />
                          )}
                          <span
                            className={
                              directContract
                                ? "min-w-0 flex-1 truncate text-xs"
                                : "min-w-0 flex-1 truncate font-mono text-xs"
                            }
                            title={account}
                          >
                            {directContract?.name ?? account}
                          </span>
                          <span className="shrink-0 font-mono text-[9px] text-muted tracking-[0.04em]">
                            {directContract ? "Contract" : "Identity"}
                          </span>
                        </Command.Item>
                      </Command.Group>
                    ) : null}

                    {history.length > 0 ? (
                      <Command.Group
                        className="mb-1"
                        heading={
                          <span className="block px-2 py-1.5 font-mono text-[10px] text-faint tracking-[0.04em]">
                            Recent
                          </span>
                        }
                      >
                        {history.map((path) => (
                          <Command.Item
                            className="flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-2 font-mono text-[12px] text-muted data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                            key={path}
                            onSelect={() => run(path)}
                            value={`recent ${labelForPath(path)} ${path}`}
                          >
                            <UiIcon className="size-4 shrink-0" name="clock" />
                            <span className="min-w-0 flex-1 truncate">{labelForPath(path)}</span>
                            <span className="shrink-0 font-mono text-[10px] text-muted">
                              {path}
                            </span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ) : null}

                    <Command.Group
                      heading={
                        <span className="block px-2 py-1.5 font-mono text-[10px] text-faint tracking-[0.04em]">
                          Navigate
                        </span>
                      }
                    >
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        const current = activeFor(pathname ?? "", item.href);
                        return (
                          <Command.Item
                            className="flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-2 font-mono text-[12px] text-muted data-[selected=true]:bg-surface-secondary data-[selected=true]:text-foreground"
                            key={item.href}
                            onSelect={() => run(item.href)}
                            value={`${item.label} ${item.href}`}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {current ? (
                              <span className="font-mono text-[9px] text-faint tracking-[0.04em]">
                                current
                              </span>
                            ) : null}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>

                    {query.trim().length >= 3 && (isFetching || results.length > 0) ? (
                      <Command.Group
                        heading={
                          <span className="block px-2 py-1.5 font-mono text-[10px] text-faint tracking-[0.04em]">
                            Index search
                          </span>
                        }
                      >
                        {isFetching ? (
                          <Command.Loading className="px-3 py-2 text-muted text-xs">
                            Searching the index…
                          </Command.Loading>
                        ) : null}
                        {results.map((result, index) => (
                          <SearchResultRow
                            key={`${result.type}-${index}`}
                            onSelect={run}
                            result={result}
                            skipIdentity={account}
                            skipTransaction={transaction}
                          />
                        ))}
                      </Command.Group>
                    ) : null}
                  </Command.List>

                  <div className="flex items-center justify-between gap-4 bg-surface-secondary/50 px-4 py-2 text-[10px] text-muted">
                    <span>↑↓ navigate · ↵ open · cmd+k toggle</span>
                    <span>esc close</span>
                  </div>
                </Command>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center"
            key="notch"
          >
            <motion.button
              aria-keyshortcuts="Meta+K Control+K"
              aria-label="Search or jump to"
              className="corner-frame-bottom pointer-events-auto flex h-9 items-center justify-center gap-2 rounded-b-[3px] bg-surface px-4 font-mono text-[12px] text-muted transition-colors hover:bg-surface-secondary hover:text-foreground sm:min-w-52 sm:px-6"
              layoutId="command-surface"
              onClick={() => onOpenChange(true)}
              transition={{
                damping: 34,
                mass: 0.7,
                stiffness: 360,
                type: "spring",
              }}
              type="button"
            >
              <UiIcon className="size-3.5 shrink-0" name="search" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded-[2px] bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted md:inline">
                ⌘K
              </kbd>
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
