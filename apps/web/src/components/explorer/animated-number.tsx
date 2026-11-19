"use client";

import NumberFlow, { type NumberFlowProps } from "@number-flow/react";

export function AnimatedNumber({
  className,
  format,
  prefix,
  suffix,
  value,
}: {
  className?: string;
  format?: NumberFlowProps["format"];
  prefix?: string;
  suffix?: string;
  value: number | null | undefined;
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={className}>—</span>;
  }

  return (
    <NumberFlow
      className={className}
      format={format}
      prefix={prefix}
      suffix={suffix}
      value={value}
    />
  );
}
