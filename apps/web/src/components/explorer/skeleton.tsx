import { classNames } from "@/lib/format";

type SkeletonSize = number | string;

/**
 * Placeholder bars for loading states. A single line renders one bar; pass
 * `lines` to stack several. Sizes accept numbers (pixels) or CSS lengths such
 * as `"1em"` so a bar can follow the surrounding font-size.
 */
export function Skeleton({
  as: Element = "div",
  className,
  gap = 8,
  height = 12,
  lines = 1,
  width = "100%",
  widths,
}: {
  as?: "div" | "span";
  className?: string;
  gap?: number;
  height?: SkeletonSize;
  lines?: number;
  width?: SkeletonSize;
  widths?: SkeletonSize[];
}) {
  if (lines <= 1) {
    return (
      <Element
        aria-hidden="true"
        className={classNames("block animate-pulse rounded-[3px] bg-surface-secondary", className)}
        style={{ height, width: widths?.[0] ?? width }}
      />
    );
  }

  return (
    <Element aria-hidden="true" className={classNames("flex flex-col", className)} style={{ gap }}>
      {Array.from({ length: lines }, (_, index) => (
        <span
          className="block animate-pulse rounded-[3px] bg-surface-secondary"
          key={index}
          style={{ height, width: widths?.[index] ?? width }}
        />
      ))}
    </Element>
  );
}
