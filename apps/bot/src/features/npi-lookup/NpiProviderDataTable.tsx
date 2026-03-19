"use client";

import { Button } from "@atlas/subframe/components/Button";
import type { NpiProviderRow } from "@atlas/schemas/npi";
import { FeatherChevronLeft, FeatherChevronRight } from "@subframe/core";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";
import { buildNpiTableColumns } from "./npiTableColumns.tsx";
import { NpiProviderExpandedRow } from "./NpiProviderExpandedRow.tsx";

type Props = {
  rows: NpiProviderRow[];
  hasMore: boolean;
  hasPrevious: boolean;
  page: number;
  onPageChange: (p: number) => void;
  isLoading: boolean;
};

export function NpiProviderDataTable({
  rows,
  hasMore,
  hasPrevious,
  page,
  onPageChange,
  isLoading,
}: Props) {
  const columns = useMemo(() => buildNpiTableColumns(), []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const table = useReactTable({
    data: rows,
    columns,
    state: { expanded },
    onExpandedChange: (updaterOrValue) => {
      if (typeof updaterOrValue === "function") {
        setExpanded(updaterOrValue(expanded) as Record<string, boolean>);
      } else {
        setExpanded(updaterOrValue as Record<string, boolean>);
      }
    },
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (r) => r.npi,
  });

  return (
    <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
      <div className="flex w-full items-start overflow-x-auto">
        <div className="flex min-w-[1024px] grow shrink-0 basis-0 flex-col items-start">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b border-solid border-neutral-border bg-neutral-50"
                >
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-6 py-3 text-left text-caption-bold font-caption-bold text-subtext-color"
                      style={{ width: h.getSize() || undefined }}
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-8 text-center text-body font-body text-subtext-color"
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-8 text-center text-body font-body text-subtext-color"
                  >
                    No results. Adjust filters and search.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className={`cursor-pointer border-b border-solid border-neutral-border transition-colors hover:bg-neutral-50 ${row.getIsExpanded() ? "bg-brand-50" : ""}`}
                      onClick={() => row.toggleExpanded()}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 align-middle">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                    {row.getIsExpanded() ? (
                      <tr className="border-b border-solid border-neutral-border bg-brand-50">
                        <td
                          colSpan={row.getVisibleCells().length}
                          className="p-0"
                        >
                          <NpiProviderExpandedRow row={row.original} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex w-full items-center justify-between px-6 py-4 mobile:flex-col mobile:flex-nowrap mobile:gap-4">
        <span className="text-body font-body text-subtext-color">
          {page === 0 && rows.length === 0
            ? ""
            : page === 0
              ? "Page 1"
              : `Page ${page + 1}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="neutral-tertiary"
            size="small"
            icon={<FeatherChevronLeft />}
            disabled={!hasPrevious || isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(page - 1);
            }}
          >
            Previous
          </Button>
          <Button
            variant="neutral-tertiary"
            size="small"
            iconRight={<FeatherChevronRight />}
            disabled={!hasMore || isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(page + 1);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
