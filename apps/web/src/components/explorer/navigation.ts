import { BrainIcon } from "@solar-icons/react/linear/brain";
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { Home2Icon } from "@solar-icons/react/linear/home-2";
import { LayersIcon } from "@solar-icons/react/linear/layers";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";

export const navigation = [
  { href: "/", icon: Home2Icon, label: "Overview" },
  { href: "/ticks", icon: LayersIcon, label: "Ticks" },
  { href: "/epochs", icon: ClockCircleIcon, label: "Epochs" },
  { href: "/accounts", icon: UsersGroupRoundedIcon, label: "Accounts" },
  { href: "/bpp9000", icon: BrainIcon, label: "BPP-9000" },
] as const;

export function activeFor(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionFor(pathname: string) {
  const primary = navigation.find((item) => activeFor(pathname, item.href));
  if (primary) {
    return primary.label;
  }
  if (pathname.startsWith("/transactions")) {
    return "Transactions";
  }
  if (pathname.startsWith("/events")) {
    return "Events";
  }
  if (pathname.startsWith("/assets")) {
    return "Assets";
  }
  return "Overview";
}
