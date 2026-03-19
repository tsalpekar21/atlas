"use client";

import type { DoctorSiteCrawlListRow } from "@atlas/schemas/npi";
import { TextField } from "@atlas/subframe/components/TextField";
import { FeatherSearch } from "@subframe/core";
import {
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { crawlStatusLabel } from "./crawlStatusLabel.ts";
import { buildCrawlTableColumns } from "./crawlTableColumns.tsx";

const globalFilterFn: FilterFn<DoctorSiteCrawlListRow> = (
	row,
	_columnId,
	filterValue,
) => {
	const q = String(filterValue ?? "")
		.trim()
		.toLowerCase();
	if (!q) return true;
	const r = row.original;
	const hay = [
		r.npi,
		r.seedUrl,
		r.searchId,
		r.firecrawlJobId ?? "",
		crawlStatusLabel(r.crawlStatusFinal),
		String(r.pageCount),
		r.createdAt,
	]
		.join(" ")
		.toLowerCase();
	return hay.includes(q);
};

type Props = {
	rows: DoctorSiteCrawlListRow[];
	isLoading: boolean;
};

export function CrawledWebsitesDataTable({ rows, isLoading }: Props) {
	const columns = useMemo(() => buildCrawlTableColumns(), []);
	const [globalFilter, setGlobalFilter] = useState("");

	const table = useReactTable({
		data: rows,
		columns,
		state: { globalFilter },
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getRowId: (r) => r.id,
	});

	const visibleCount = table.getFilteredRowModel().rows.length;

	return (
		<div className="flex w-full flex-col items-start gap-4">
			<TextField
				className="h-auto w-full max-w-md"
				label="Filter"
				icon={<FeatherSearch />}
			>
				<TextField.Input
					placeholder="Search NPI, URL, status, job ID…"
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
				/>
			</TextField>
			<div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
				<div className="flex w-full items-start overflow-x-auto">
					<div className="flex min-w-[960px] grow shrink-0 basis-0 flex-col items-start">
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
													: flexRender(
															h.column.columnDef.header,
															h.getContext(),
														)}
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
											No crawls recorded yet.
										</td>
									</tr>
								) : table.getRowModel().rows.length === 0 ? (
									<tr>
										<td
											colSpan={columns.length}
											className="px-6 py-8 text-center text-body font-body text-subtext-color"
										>
											No rows match your filter.
										</td>
									</tr>
								) : (
									table.getRowModel().rows.map((row) => (
										<tr
											key={row.id}
											className="border-b border-solid border-neutral-border transition-colors hover:bg-neutral-50"
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
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
				{!isLoading && rows.length > 0 ? (
					<div className="flex w-full items-center justify-between border-t border-solid border-neutral-border px-6 py-3">
						<span className="text-caption font-caption text-subtext-color">
							Showing {visibleCount} of {rows.length} crawls
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}
