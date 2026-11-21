"use client";

import { Skeleton } from "@heroui/react";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { tableFeatures, useTable } from "@tanstack/react-table";
import type { ReactNode } from "react";

export const tableFeaturesConfig = tableFeatures({});

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<typeof tableFeaturesConfig, TData, unknown>[];
  data: TData[];
  empty?: ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  onRowClick?: (row: TData) => void;
  rowKey?: (row: TData, index: number) => string;
};

function headerLabel(header: { column: { columnDef: { header?: unknown } } }) {
  const value = header.column.columnDef.header;
  return typeof value === "string" ? value : "";
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  empty,
  isLoading,
  loadingRows = 6,
  onRowClick,
  rowKey,
}: DataTableProps<TData>) {
  const table = useTable({
    columns,
    data,
    features: tableFeaturesConfig,
  });
  const rows = table.getRowModel().rows;
  const headerGroup = table.getHeaderGroups().at(-1);
  const headers = headerGroup?.headers ?? [];

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: loadingRows }).map((_, rowIndex) => (
          <div
            className="flex items-center gap-4 rounded-xl px-3 py-4"
            key={`skeleton-${rowIndex}`}
          >
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-muted text-sm">{empty ?? "Nothing indexed yet."}</p>
    );
  }

  return (
    <>
      <div className="space-y-1 md:hidden">
        {rows.map((row, index) => {
          const cells = row.getAllCells();
          const primary = cells[0];
          return (
            <div
              className={[
                "rounded-xl px-3 py-3.5 transition-colors",
                onRowClick ? "cursor-pointer hover:bg-surface-secondary" : "",
              ].join(" ")}
              key={rowKey ? rowKey(row.original, index) : row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row.original);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
            >
              <div className="min-w-0">{primary ? <table.FlexRender cell={primary} /> : null}</div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                {cells.slice(1).map((cell, cellIndex) => (
                  <div className="min-w-0" key={cell.id}>
                    <dt className="text-[10px] text-muted">
                      {headerLabel(headers[cellIndex + 1] ?? { column: cell.column })}
                    </dt>
                    <dd className="mt-0.5 min-w-0 break-words text-foreground text-xs">
                      <table.FlexRender cell={cell} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    className="whitespace-nowrap px-3 py-2 font-medium text-[10px] text-muted"
                    key={header.id}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                className={[
                  "rounded-xl transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-surface-secondary" : "",
                ].join(" ")}
                key={rowKey ? rowKey(row.original, index) : row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
              >
                {row.getAllCells().map((cell) => (
                  <td className="whitespace-nowrap px-3 py-3.5 align-middle" key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
