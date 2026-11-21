import { BrainIcon } from "@solar-icons/react/linear/brain";
import { BookmarkIcon } from "@solar-icons/react/linear/bookmark";
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { CodeSquareIcon } from "@solar-icons/react/linear/code-square";
import { CpuBoltIcon } from "@solar-icons/react/linear/cpu-bolt";
import { DollarMinimalisticIcon } from "@solar-icons/react/linear/dollar-minimalistic";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { Home2Icon } from "@solar-icons/react/linear/home-2";
import { LayersIcon } from "@solar-icons/react/linear/layers";
import { TransferHorizontalIcon } from "@solar-icons/react/linear/transfer-horizontal";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";
import type { ComponentType } from "react";

export interface NavigationItem {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

const overview = {
  href: "/",
  icon: Home2Icon,
  label: "Overview",
} satisfies NavigationItem;

const ticks = {
  href: "/ticks",
  icon: LayersIcon,
  label: "Ticks",
} satisfies NavigationItem;

const epochs = {
  href: "/epochs",
  icon: ClockCircleIcon,
  label: "Epochs",
} satisfies NavigationItem;

const computors = {
  href: "/computors",
  icon: CpuBoltIcon,
  label: "Computors",
} satisfies NavigationItem;

const transactions = {
  href: "/transactions",
  icon: TransferHorizontalIcon,
  label: "Transactions",
} satisfies NavigationItem;

const accounts = {
  href: "/accounts",
  icon: UsersGroupRoundedIcon,
  label: "Accounts",
} satisfies NavigationItem;

const assets = {
  href: "/assets",
  icon: DollarMinimalisticIcon,
  label: "Assets",
} satisfies NavigationItem;

const addresses = {
  href: "/addresses",
  icon: BookmarkIcon,
  label: "Known addresses",
} satisfies NavigationItem;

const contracts = {
  href: "/contracts",
  icon: CodeSquareIcon,
  label: "Contracts",
} satisfies NavigationItem;

const proposals = {
  href: "/proposals",
  icon: DocumentTextIcon,
  label: "Proposals",
} satisfies NavigationItem;

const bpp = {
  href: "/bpp9000",
  icon: BrainIcon,
  label: "BPP-9000",
} satisfies NavigationItem;

export const navigation = [
  overview,
  ticks,
  epochs,
  computors,
  transactions,
  accounts,
  assets,
  addresses,
  contracts,
  proposals,
  bpp,
] as const;

export const primaryNavigation = [overview, bpp] as const;

export const chainNavigation = [ticks, epochs, computors, transactions, addresses] as const;

export const buildNavigation = [contracts, proposals] as const;

export function activeFor(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionFor(pathname: string) {
  const current = navigation.find((item) => activeFor(pathname, item.href));
  return current?.label ?? "Overview";
}
