import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

function cellPadding(index: number, total: number): string {
  return `${index === 0 || index === total - 1 ? "px-4" : "px-3"} py-3`;
}

export function ActivityTable({
  children,
  label,
  minWidth,
}: {
  children: ReactNode;
  label?: string;
  minWidth: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="overflow-x-auto">
        <table
          aria-label={label}
          className={classNames(
            "w-full table-fixed border-separate border-spacing-0 text-left",
            minWidth,
          )}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function ActivityTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="text-[10px] text-muted uppercase tracking-[0.14em]">{children}</tr>
    </thead>
  );
}

export function ActivityTableRow({
  children,
  className,
  hover = true,
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  interactive?: boolean;
}) {
  return (
    <tr
      className={classNames(
        "group relative transition-colors",
        interactive && "cursor-pointer",
        hover && "hover:bg-surface-secondary",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export type ActivityTableSkeletonColumn = {
  align?: "left" | "right";
  barClassName: string;
  header: string;
  width: string;
};

export function ActivityTableSkeleton({
  columns,
  label,
  minWidth,
  rows = 8,
}: {
  columns: ActivityTableSkeletonColumn[];
  label: string;
  minWidth: string;
  rows?: number;
}) {
  return (
    <ActivityTable label={label} minWidth={minWidth}>
      <ActivityTableHead>
        {columns.map((column, index) => (
          <th
            className={classNames(
              column.width,
              cellPadding(index, columns.length),
              "font-normal",
              column.align === "right" && "text-right",
            )}
            key={column.header}
          >
            {column.header}
          </th>
        ))}
      </ActivityTableHead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column, index) => (
              <td
                className={classNames(
                  cellPadding(index, columns.length),
                  column.align === "right" && "text-right",
                )}
                key={column.header}
              >
                <span
                  className={classNames(
                    "inline-block h-3 animate-pulse rounded bg-surface-secondary",
                    column.align === "right" && "ml-auto",
                    column.barClassName,
                  )}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </ActivityTable>
  );
}
