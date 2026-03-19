"use client";

import { NpiProviderDataTable } from "./NpiProviderDataTable.tsx";
import { NpiSearchCriteria } from "./NpiSearchCriteria.tsx";
import { useNpiProviderSearch } from "./useNpiProviderSearch.ts";

export function NpiPhysicianLookupPage() {
	const {
		filters,
		setFilters,
		runSearch,
		page,
		goToPage,
		data,
		isFetching,
		isLoading,
		isPending,
		hasSearched,
		error,
	} = useNpiProviderSearch();

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-neutral-50">
			<div className="flex w-full flex-col items-center px-6 py-8 pb-12">
				<div className="flex w-full max-w-[1280px] flex-col items-start gap-8">
					<div className="flex flex-col items-start gap-2">
						<span className="text-heading-1 font-heading-1 text-default-font">
							NPI Provider Database
						</span>
						<span className="text-body font-body text-subtext-color">
							Search and verify healthcare providers. Expand a provider&apos;s
							row to view web insights and run automated data extraction.
						</span>
					</div>

					<NpiSearchCriteria
						filters={filters}
						onChange={setFilters}
						onSearch={runSearch}
						isSearching={isFetching || isLoading}
					/>

					{error ? (
						<div className="rounded-md border border-error-200 bg-error-50 px-4 py-3 text-body font-body text-error-700">
							{error instanceof Error ? error.message : String(error)}
						</div>
					) : null}

					<NpiProviderDataTable
						rows={data?.results ?? []}
						hasMore={data?.hasMore ?? false}
						hasPrevious={data?.hasPrevious ?? false}
						page={page}
						onPageChange={goToPage}
						isLoading={hasSearched && (isPending || (isFetching && !data))}
					/>
				</div>
			</div>
		</div>
	);
}
