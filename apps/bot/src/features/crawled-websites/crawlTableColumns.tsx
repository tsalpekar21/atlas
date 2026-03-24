import type {
	CrawlRagIndexResponse,
	DoctorSiteCrawlListRow,
} from "@atlas/schemas/npi";
import { Button } from "@atlas/subframe/components/Button";
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

export type CrawlTableColumnsOptions = {
	onChunk: (crawlId: string) => void;
	chunkingId: string | null;
	chunkResults: Partial<Record<string, CrawlRagIndexResponse>>;
	chunkErrorCrawlId: string | null;
	chunkErrorMessage: string | null;
};

export function buildCrawlTableColumns(
	options: CrawlTableColumnsOptions,
): ColumnDef<DoctorSiteCrawlListRow>[] {
	const {
		onChunk,
		chunkingId,
		chunkResults,
		chunkErrorCrawlId,
		chunkErrorMessage,
	} = options;

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
			id: "chunk",
			header: "Chunk",
			size: 148,
			cell: ({ row }) => {
				const id = row.original.id;
				const pageCount = row.original.pageCount;
				const busy = chunkingId === id;
				const result = chunkResults[id];
				const showErr =
					chunkErrorCrawlId === id && chunkErrorMessage != null;
				return (
					<div className="flex max-w-[200px] flex-col items-start gap-1">
						<Button
							size="small"
							variant="neutral-secondary"
							loading={busy}
							disabled={busy || pageCount === 0}
							onClick={() => onChunk(id)}
						>
							Chunk
						</Button>
						{result ? (
							<span className="text-caption font-caption text-subtext-color">
								{result.chunksIndexed} indexed
								{result.pagesSkipped > 0
									? ` · ${result.pagesSkipped} pages skipped`
									: ""}
							</span>
						) : null}
						{showErr ? (
							<span className="text-caption font-caption text-error-600">
								{chunkErrorMessage}
							</span>
						) : null}
					</div>
				);
			},
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
