import type { NpiProviderRow } from "@atlas/schemas/npi";
import { Badge } from "@atlas/subframe/components/Badge";
import { FeatherCheck, FeatherClock, FeatherLoader } from "@subframe/core";
import type { ColumnDef } from "@tanstack/react-table";

function DataStatusBadge({ row }: { row: NpiProviderRow }) {
	const { dataStatus, crawlCompleted, crawlTotal } = row.enrichment;
	if (dataStatus === "verified") {
		return (
			<Badge variant="success" icon={<FeatherCheck />}>
				Verified
			</Badge>
		);
	}
	if (dataStatus === "crawling") {
		const pct =
			crawlTotal && crawlTotal > 0
				? Math.round(((crawlCompleted ?? 0) / crawlTotal) * 100)
				: null;
		return (
			<Badge variant="warning" icon={<FeatherLoader />}>
				{pct != null ? `Crawling (${pct}%)` : "Crawling..."}
			</Badge>
		);
	}
	return (
		<Badge variant="neutral" icon={<FeatherClock />} className="w-fit">
			Pending crawl
		</Badge>
	);
}

export function buildNpiTableColumns(): ColumnDef<NpiProviderRow>[] {
	return [
		{
			id: "expander",
			header: () => null,
			cell: ({ row }) => (
				<div className="flex w-6 flex-none items-center justify-center">
					{row.getIsExpanded() ? (
						<span className="text-brand-600">▼</span>
					) : (
						<span className="text-neutral-400">▶</span>
					)}
				</div>
			),
			size: 24,
		},
		{
			accessorKey: "providerName",
			header: "Provider Name",
			cell: ({ row, getValue }) => (
				<span
					className={
						row.getIsExpanded()
							? "text-body-bold font-body-bold text-brand-700"
							: "text-body-bold font-body-bold text-default-font"
					}
				>
					{getValue<string>()}
				</span>
			),
		},
		{
			accessorKey: "npi",
			header: "NPI",
			cell: ({ getValue }) => (
				<span className="text-body font-body text-subtext-color">
					{getValue<string>()}
				</span>
			),
		},
		{
			accessorKey: "title",
			header: "Title",
			cell: ({ getValue }) => (
				<span className="text-body font-body text-subtext-color">
					{getValue<string>()}
				</span>
			),
		},
		{
			accessorKey: "specialty",
			header: "Specialty",
		},
		{
			id: "dataStatus",
			header: "Data Status",
			cell: ({ row }) => <DataStatusBadge row={row.original} />,
		},
	];
}
