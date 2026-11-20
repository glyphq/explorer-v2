"use client";

import { Button, Modal, SearchField } from "@heroui/react";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import { classNames, formatInteger, shorten } from "@/lib/format";

import type { BppRace, BppRaceEntry } from "./types";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
});

function alignmentOf(entry: BppRaceEntry, bar: number): boolean {
  return entry.errors <= bar;
}

function deltaLabel(entry: BppRaceEntry, bar: number): string {
  const delta = entry.errors - bar;
  if (delta === 0) {
    return "On bar";
  }
  return `${formatInteger(Math.abs(delta))} ${delta < 0 ? "under" : "over"}`;
}

function SortArrow({ active, desc }: { active: boolean; desc: boolean }) {
  if (!active) {
    return null;
  }
  return <AltArrowDownIcon className={classNames("size-3", desc ? "" : "rotate-180")} />;
}

function SortButton({
  active,
  desc,
  id,
  label,
  onToggle,
}: {
  active: boolean;
  desc: boolean;
  id: string;
  label: string;
  onToggle: (id: string) => void;
}) {
  const handlePress = useCallback(() => onToggle(id), [id, onToggle]);
  return (
    <Button
      className={classNames("h-7 min-w-0 px-2 text-xs", active && "bg-surface-secondary")}
      onPress={handlePress}
      size="sm"
      variant="tertiary"
    >
      {label}
      <SortArrow active={active} desc={desc} />
    </Button>
  );
}

function SortHeader({
  children,
  columnId,
  onToggle,
  sortDesc,
  sorted,
}: {
  children: ReactNode;
  columnId: string;
  onToggle: (id: string) => void;
  sortDesc: boolean;
  sorted: boolean;
}) {
  const handleClick = useCallback(() => onToggle(columnId), [columnId, onToggle]);
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground"
      onClick={handleClick}
      type="button"
    >
      {children}
      <SortArrow active={sorted} desc={sortDesc} />
    </button>
  );
}

export function AlignmentModal({
  onOpenChange,
  open,
  race,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  race: BppRace | null;
}) {
  const [query, setQuery] = useState("");
  const bar = race?.bar ?? 0;
  const board = race?.board ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return board;
    }
    return board.filter((entry) => entry.id.toLowerCase().includes(needle));
  }, [board, query]);

  const columns = useMemo<ColumnDef<typeof features, BppRaceEntry, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        cell: ({ getValue }) => {
          const id = getValue<string>();
          return (
            <span className="font-mono text-xs" title={id}>
              {shorten(id, 10, 6)}
            </span>
          );
        },
        header: "Computor",
        sortFn: sortFn_text,
      },
      {
        accessorKey: "errors",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatInteger(getValue<number>())}</span>
        ),
        header: "Errors",
        sortFn: sortFn_basic,
      },
      {
        accessorFn: (entry) => entry.errors - bar,
        cell: ({ row }) => (
          <span className="text-muted text-xs tabular-nums">{deltaLabel(row.original, bar)}</span>
        ),
        enableSorting: false,
        header: "vs bar",
        id: "delta",
      },
      {
        accessorKey: "frame",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatInteger(getValue<number>())}</span>
        ),
        header: "Frame",
        sortFn: sortFn_basic,
      },
      {
        accessorFn: (entry) => (alignmentOf(entry, bar) ? "Aligned" : "Not aligned"),
        cell: ({ row }) => {
          const aligned = alignmentOf(row.original, bar);
          return (
            <span className={aligned ? "text-success text-xs" : "text-muted text-xs"}>
              {aligned ? "Aligned" : "Not aligned"}
            </span>
          );
        },
        enableSorting: false,
        header: "Status",
        id: "status",
      },
    ],
    [bar],
  );

  const table = useTable({
    columns,
    data: filtered,
    features,
    initialState: { sorting: [{ desc: false, id: "errors" }] },
  });

  const { rows } = table.getRowModel();
  const [sorting] = table.state.sorting;
  const alignedCount = board.filter((entry) => alignmentOf(entry, bar)).length;
  const notAlignedCount = board.length - alignedCount;

  const toggleSort = useCallback(
    (id: string) => {
      const desc = sorting?.id === id ? !sorting.desc : false;
      table.setSorting([{ desc, id }]);
    },
    [sorting, table],
  );

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container
          className="modal-sheet p-0 sm:p-0"
          placement="top"
          scroll="inside"
          size="lg"
        >
          <Modal.Dialog className="max-h-[88dvh] rounded-t-none rounded-b-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Computor alignment</Modal.Heading>
              <p className="mt-1 text-muted text-sm">
                {formatInteger(alignedCount)} aligned · {formatInteger(notAlignedCount)} not aligned
                · bar {formatInteger(bar)} errors
              </p>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchField
                  aria-label="Search computors by identity"
                  className="w-full sm:max-w-xs"
                  onChange={setQuery}
                  value={query}
                >
                  <SearchField.Group>
                    <SearchField.SearchIcon>
                      <MagnifierIcon className="size-4" />
                    </SearchField.SearchIcon>
                    <SearchField.Input placeholder="Search identity" />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <p className="text-muted text-xs tabular-nums">
                  {query.trim()
                    ? `${formatInteger(rows.length)} matches`
                    : `${formatInteger(board.length)} computors`}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:hidden">
                {[
                  { id: "errors", label: "Errors" },
                  { id: "frame", label: "Frame" },
                  { id: "id", label: "Identity" },
                ].map((option) => (
                  <SortButton
                    active={sorting?.id === option.id}
                    desc={sorting?.desc ?? false}
                    id={option.id}
                    key={option.id}
                    label={option.label}
                    onToggle={toggleSort}
                  />
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="py-10 text-center text-muted text-sm">
                  No computor matches that identity.
                </p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr>
                          {table.getHeaderGroups()[0]?.headers.map((header) => (
                            <th
                              className="whitespace-nowrap px-2 py-2 font-medium text-muted text-xs"
                              key={header.id}
                            >
                              {header.column.getCanSort() ? (
                                <SortHeader
                                  columnId={header.column.id}
                                  onToggle={toggleSort}
                                  sortDesc={sorting?.desc ?? false}
                                  sorted={sorting?.id === header.column.id}
                                >
                                  <table.FlexRender header={header} />
                                </SortHeader>
                              ) : (
                                <table.FlexRender header={header} />
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr className="rounded-md hover:bg-surface-secondary/55" key={row.id}>
                            {row.getAllCells().map((cell) => (
                              <td
                                className="whitespace-nowrap px-2 py-2 align-middle"
                                key={cell.id}
                              >
                                <table.FlexRender cell={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="grid gap-1.5 sm:hidden">
                    {rows.map((row) => {
                      const entry = row.original;
                      const aligned = alignmentOf(entry, bar);
                      return (
                        <li className="rounded-md bg-surface-secondary/55 p-3" key={row.id}>
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className="min-w-0 break-all font-mono text-muted text-xs"
                              title={entry.id}
                            >
                              {shorten(entry.id, 12, 8)}
                            </span>
                            <span
                              className={classNames(
                                "shrink-0 text-xs",
                                aligned ? "text-success" : "text-muted",
                              )}
                            >
                              {aligned ? "Aligned" : "Not aligned"}
                            </span>
                          </div>
                          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <dt className="text-muted">Errors</dt>
                              <dd className="mt-0.5 tabular-nums">{formatInteger(entry.errors)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted">vs bar</dt>
                              <dd className="mt-0.5 text-muted tabular-nums">
                                {deltaLabel(entry, bar)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted">Frame</dt>
                              <dd className="mt-0.5 tabular-nums">{formatInteger(entry.frame)}</dd>
                            </div>
                          </dl>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
