import type { ComponentType } from "react";

import { icons } from "@/lib/icons";

export interface NavigationItem {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

const overview = {
  href: "/",
  icon: icons.home,
  label: "Overview",
} satisfies NavigationItem;

const ticks = {
  href: "/ticks",
  icon: icons.layers,
  label: "Ticks",
} satisfies NavigationItem;

const epochs = {
  href: "/epochs",
  icon: icons.clock,
  label: "Epochs",
} satisfies NavigationItem;

const computors = {
  href: "/computors",
  icon: icons.cpu,
  label: "Computors",
} satisfies NavigationItem;

const transactions = {
  href: "/transactions",
  icon: icons.exchange,
  label: "Transactions",
} satisfies NavigationItem;

const accounts = {
  href: "/accounts",
  icon: icons.users,
  label: "Identities",
} satisfies NavigationItem;

const addresses = {
  href: "/addresses",
  icon: icons.bookmark,
  label: "Known addresses",
} satisfies NavigationItem;

const contracts = {
  href: "/contracts",
  icon: icons.code,
  label: "Contracts",
} satisfies NavigationItem;

const proposals = {
  href: "/proposals",
  icon: icons.document,
  label: "Proposals",
} satisfies NavigationItem;

export const navigation = [
  overview,
  ticks,
  epochs,
  computors,
  transactions,
  accounts,
  addresses,
  contracts,
  proposals,
] as const;

export const primaryNavigation = [overview] as const;

export const chainNavigation = [ticks, epochs, computors, transactions, addresses] as const;

export const buildNavigation = [contracts, proposals] as const;

export function activeFor(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionFor(pathname: string) {
  const current = navigation.find((item) => activeFor(pathname, item.href));
  return current?.label ?? "Overview";
}
