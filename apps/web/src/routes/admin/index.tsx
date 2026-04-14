import type { AdminWebsite } from "@atlas/schemas/api";
import { Table } from "@atlas/subframe/components/Table";
import { FeatherGlobe } from "@subframe/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { listAdminWebsites } from "@/lib/admin/admin-api-client";

export const Route = createFileRoute("/admin/")({
	head: () => ({
		meta: [{ title: "Admin · Websites — Atlas Health" }],
	}),
	component: AdminWebsitesPage,
});

const columnHelper = createColumnHelper<AdminWebsite>();

const columns = [
	columnHelper.accessor("title", {
		header: "Name",
		cell: (info) => (
			<div className="flex items-center gap-2">
				<FeatherGlobe className="text-body font-body text-subtext-color" />
				<span className="whitespace-nowrap text-body-bold font-body-bold text-neutral-700">
					{info.getValue()}
				</span>
			</div>
		),
	}),
	columnHelper.accessor("rootDomain", {
		header: "URL",
		cell: (info) => (
			<span className="whitespace-nowrap text-body font-body text-neutral-500">
				{info.getValue()}
			</span>
		),
	}),
	columnHelper.accessor("pageCount", {
		header: "Pages",
		cell: (info) => (
			<span className="whitespace-nowrap text-body font-body text-default-font">
				{info.getValue()}
			</span>
		),
	}),
];

function AdminWebsitesPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["admin", "websites"],
		queryFn: listAdminWebsites,
	});

	const websites = useMemo(() => data?.websites ?? [], [data?.websites]);

	const table = useReactTable({
		data: websites,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-6 overflow-y-auto px-8 py-8 mobile:px-4 mobile:py-6">
			<div className="flex w-full flex-col items-start gap-1">
				<span className="text-heading-1 font-heading-1 text-default-font mobile:text-heading-2 mobile:font-heading-2">
					Websites
				</span>
				<span className="text-body font-body text-subtext-color">
					Manage crawled websites for RAG knowledge base
				</span>
			</div>

			<div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
				<div className="flex w-full items-start overflow-x-auto">
					<div className="flex min-w-[768px] grow shrink-0 basis-0 flex-col items-start">
						{isLoading ? (
							<div className="w-full px-4 py-6 text-body font-body text-subtext-color">
								Loading websites…
							</div>
						) : error ? (
							<div className="w-full px-4 py-6 text-body font-body text-error-600">
								Failed to load websites: {(error as Error).message}
							</div>
						) : websites.length === 0 ? (
							<div className="w-full px-4 py-6 text-body font-body text-subtext-color">
								No websites yet.
							</div>
						) : (
							<Table
								header={
									<Table.HeaderRow>
										{table.getHeaderGroups()[0]?.headers.map((header) => (
											<Table.HeaderCell key={header.id}>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</Table.HeaderCell>
										))}
									</Table.HeaderRow>
								}
							>
								{table.getRowModel().rows.map((row) => (
									<Table.Row key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<Table.Cell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</Table.Cell>
										))}
									</Table.Row>
								))}
							</Table>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
