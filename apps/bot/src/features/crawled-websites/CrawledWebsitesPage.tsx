"use client";

import type { DoctorSiteCrawlsResponse } from "@atlas/schemas/npi";
import { useQuery } from "@tanstack/react-query";
import { fetchDoctorSiteCrawls } from "@/server/npi-functions.ts";
import { CrawledWebsitesDataTable } from "./CrawledWebsitesDataTable.tsx";

export function CrawledWebsitesPage() {
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["doctor-site-crawls"],
		queryFn: (): Promise<DoctorSiteCrawlsResponse> =>
			fetchDoctorSiteCrawls({ data: {} }) as Promise<DoctorSiteCrawlsResponse>,
	});

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-neutral-50">
			<div className="flex w-full flex-col items-center px-6 py-8 pb-12">
				<div className="flex w-full max-w-[1280px] flex-col items-start gap-8">
					<div className="flex flex-col items-start gap-2">
						<h1 className="text-heading-2 font-heading-2 text-default-font">
							Crawled websites
						</h1>
						<p className="text-body font-body text-subtext-color">
							Doctor site crawls stored from enrichment. Filter locally by any
							visible field. Open a crawl via the NPI link, View, or the seed
							URL (external).
						</p>
					</div>
					{isError ? (
						<div className="rounded-md border border-error-200 bg-error-50 px-4 py-3 text-body font-body text-error-800">
							{error instanceof Error ? error.message : "Failed to load crawls"}
						</div>
					) : (
						<CrawledWebsitesDataTable
							rows={data?.crawls ?? []}
							isLoading={isLoading}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
