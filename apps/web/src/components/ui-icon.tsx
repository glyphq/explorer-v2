import type { SVGProps } from "react";

import { icons, type IconName } from "@/lib/icons";

export function UiIcon({
  className,
  name,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "name"> & { name: IconName }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className={className} {...props} />;
}

export type { IconName };
