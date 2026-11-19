import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

import { SectionHeading } from "./page-header";

export function DetailSection({
  action,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title: string;
}) {
  return (
    <section className={classNames("py-7", className)}>
      <SectionHeading action={action} description={description} title={title} />
      {children}
    </section>
  );
}
