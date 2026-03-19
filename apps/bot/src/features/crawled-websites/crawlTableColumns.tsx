import type { DoctorSiteCrawlListRow } from "@atlas/schemas/npi";
import { FeatherChevronRight } from "@subframe/core";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { crawlStatusLabel } from "./crawlStatusLabel.ts";

function formatWhen(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

export function buildCrawlTableColumns(): ColumnDef<DoctorSiteCrawlListRow>[] {
	return [
		{
			accessorKey: "npi",
			header: "NPI",
			size: 120,
			cell: ({ row, getValue }) => (
				<Link
					to="/crawled-websites/$crawlId"
					params={{ crawlId: row.original.id }}
					className="text-body-bold font-body-bold text-brand-700 hover:underline"
				>
					{String(getValue())}
				</Link>
			),
		},
		{
			accessorKey: "seedUrl",
			header: "Seed URL",
			size: 320,
			cell: ({ getValue }) => {
				const url = String(getValue());
				return (
					<a
						href={url}
						target="_blank"
						rel="noreferrer"
						className="text-body font-body text-brand-700 hover:underline break-all"
					>
						{url}
					</a>
				);
			},
		},
		{
			id: "status",
			header: "Status",
			size: 120,
			accessorFn: (row) => crawlStatusLabel(row.crawlStatusFinal),
			cell: ({ row }) => (
				<span className="text-body font-body text-default-font">
					{crawlStatusLabel(row.original.crawlStatusFinal)}
				</span>
			),
		},
		{
			accessorKey: "pageCount",
			header: "Pages",
			size: 80,
			cell: ({ getValue }) => (
				<span className="text-body font-body text-default-font">
					{String(getValue())}
				</span>
			),
		},
		{
			accessorKey: "firecrawlJobId",
			header: "Job ID",
			size: 160,
			cell: ({ getValue }) => {
				const v = getValue() as string | null;
				return (
					<span className="text-caption font-caption text-subtext-color font-mono break-all">
						{v ?? "—"}
					</span>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: "Crawled",
			size: 180,
			cell: ({ getValue }) => (
				<span className="text-body font-body text-subtext-color whitespace-nowrap">
					{formatWhen(String(getValue()))}
				</span>
			),
		},
		{
			id: "open",
			header: "View",
			size: 88,
			cell: ({ row }) => (
				<Link
					to="/crawled-websites/$crawlId"
					params={{ crawlId: row.original.id }}
					className="inline-flex items-center gap-1 text-caption-bold font-caption-bold text-brand-700 hover:underline"
				>
					View
					<FeatherChevronRight className="h-4 w-4 shrink-0" />
				</Link>
			),
		},
	];
}
