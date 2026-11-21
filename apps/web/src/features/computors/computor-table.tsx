import type { Route } from "next";
import Link from "next/link";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import type { Computor } from "@/lib/api/generated/types.gen";
import { formatInteger } from "@/lib/format";

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-8", header: "Index", width: "w-[9%]" },
  { barClassName: "w-48", header: "Identity", width: "w-[45%]" },
  { barClassName: "w-48", header: "Public key", width: "w-[46%]" },
];

function ComputorRow({ computor }: { computor: Computor }) {
  return (
    <ActivityTableRow>
      <td className="px-4 py-3 text-muted text-xs tabular-nums">
        {/* The API exposes zero-based computor_index values; show slots starting at 1. */}
        {formatInteger(computor.computor_index + 1)}
      </td>
      <td className="px-3 py-3">
        <Link
          className="block truncate font-mono text-foreground text-xs transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          href={`/accounts/${computor.identity}` as Route}
          title={computor.identity}
        >
          {computor.identity}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span
          className="block truncate font-mono text-[11px] text-muted"
          title={computor.public_key}
        >
          {computor.public_key}
        </span>
      </td>
    </ActivityTableRow>
  );
}

function ComputorTable({ computors, epoch }: { computors: Computor[]; epoch?: number }) {
  return (
    <ActivityTable
      label={epoch === undefined ? "Computors" : `Computors for epoch ${epoch}`}
      minWidth="min-w-[1040px]"
    >
      <ActivityTableHead>
        <th className="w-[9%] px-4 py-3 font-normal">Index</th>
        <th className="w-[45%] px-3 py-3 font-normal">Identity</th>
        <th className="w-[46%] px-4 py-3 font-normal">Public key</th>
      </ActivityTableHead>
      <tbody>
        {computors.map((computor) => (
          <ComputorRow computor={computor} key={computor.identity} />
        ))}
      </tbody>
    </ActivityTable>
  );
}

function ComputorTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading computors"
      minWidth="min-w-[1040px]"
      rows={rows}
    />
  );
}

export { ComputorTable, ComputorTableSkeleton };
