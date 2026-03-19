import type { NppesRegistryApiSuccess } from "@atlas/schemas/npi";
import { npiWebSearchHitSchema } from "@atlas/schemas/npi";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.ts";
import {
	doctorSiteCrawl,
	doctorWebsiteSearch,
	npiProviderFetch,
} from "../db/schema.ts";
import {
	crawlDoctorSiteWithProgress,
	crawlJobSummary,
	firstWebSearchUrl,
	jobToStoredPages,
	searchDoctorWebsite,
} from "./firecrawl.ts";
import {
	buildWebsiteSearchQuery,
	fetchNpiByNumber,
	normalizeNpi,
	registryResultCount,
} from "./npi-registry.ts";

export type EnrichmentStep =
	| "npi_fetched"
	| "search_stored"
	| "crawl_stored"
	| "skipped_no_registry"
	| "skipped_no_query"
	| "skipped_no_search_url";

export type EnrichmentResult = {
	npi: string;
	steps: EnrichmentStep[];
	error?: string;
	searchId?: string;
	crawlId?: string;
	selectedUrl?: string | null;
};

function jsonValueToRecord(v: unknown): Record<string, unknown> {
	try {
		const raw: unknown = JSON.parse(JSON.stringify(v));
		const rec = z.record(z.string(), z.unknown()).safeParse(raw);
		return rec.success ? rec.data : { _serializationError: true };
	} catch {
		return { _serializationError: true };
	}
}

async function fetchAndStoreNpiRegistry(
	npi: string,
	steps: EnrichmentStep[],
): Promise<
	| { ok: true; registry: NppesRegistryApiSuccess }
	| { ok: false; result: EnrichmentResult }
> {
	let registry: NppesRegistryApiSuccess;
	try {
		registry = await fetchNpiByNumber(npi);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		await db
			.insert(npiProviderFetch)
			.values({
				npi,
				registryResponse: { error: message, fetchFailed: true },
			})
			.onConflictDoUpdate({
				target: npiProviderFetch.npi,
				set: {
					registryResponse: { error: message, fetchFailed: true },
					fetchedAt: new Date(),
				},
			});
		return {
			ok: false,
			result: { npi, steps, error: `npi_fetch: ${message}` },
		};
	}

	await db
		.insert(npiProviderFetch)
		.values({ npi, registryResponse: registry })
		.onConflictDoUpdate({
			target: npiProviderFetch.npi,
			set: { registryResponse: registry, fetchedAt: new Date() },
		});
	steps.push("npi_fetched");

	if (registryResultCount(registry) === 0) {
		steps.push("skipped_no_registry");
		return { ok: false, result: { npi, steps } };
	}

	return { ok: true, registry };
}

async function runCrawlForSelectedUrl(
	npi: string,
	searchId: string,
	seedUrl: string,
	steps: EnrichmentStep[],
): Promise<EnrichmentResult> {
	let crawlRowId: string | undefined;
	try {
		const finalJob = await crawlDoctorSiteWithProgress(
			{ seedUrl, pageLimit: 30 },
			async (tick) => {
				const scraping = {
					status: "scraping" as const,
					completed: tick.completed ?? 0,
					total: tick.total ?? 0,
					id: tick.id,
				};
				if (!crawlRowId) {
					const [row] = await db
						.insert(doctorSiteCrawl)
						.values({
							npi,
							searchId,
							seedUrl,
							firecrawlJobId: tick.id,
							crawlStatusFinal: jsonValueToRecord(scraping),
							pages: [],
						})
						.returning({ id: doctorSiteCrawl.id });
					crawlRowId = row.id;
				} else {
					await db
						.update(doctorSiteCrawl)
						.set({ crawlStatusFinal: jsonValueToRecord(scraping) })
						.where(eq(doctorSiteCrawl.id, crawlRowId));
				}
			},
		);

		if (!crawlRowId) {
			throw new Error("Crawl did not produce a trackable row");
		}

		await db
			.update(doctorSiteCrawl)
			.set({
				crawlStatusFinal: jsonValueToRecord(crawlJobSummary(finalJob)),
				pages: jobToStoredPages(finalJob),
			})
			.where(eq(doctorSiteCrawl.id, crawlRowId));

		steps.push("crawl_stored");
		return {
			npi,
			steps,
			searchId,
			crawlId: crawlRowId,
			selectedUrl: seedUrl,
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		if (crawlRowId) {
			await db
				.update(doctorSiteCrawl)
				.set({
					crawlStatusFinal: { error: message, status: "failed" },
					pages: [],
				})
				.where(eq(doctorSiteCrawl.id, crawlRowId));
			steps.push("crawl_stored");
			return {
				npi,
				steps,
				error: `firecrawl_crawl: ${message}`,
				searchId,
				crawlId: crawlRowId,
				selectedUrl: seedUrl,
			};
		}
		const [crawlRow] = await db
			.insert(doctorSiteCrawl)
			.values({
				npi,
				searchId,
				seedUrl,
				firecrawlJobId: null,
				crawlStatusFinal: { error: message, status: "failed" },
				pages: [],
			})
			.returning({ id: doctorSiteCrawl.id });
		steps.push("crawl_stored");
		return {
			npi,
			steps,
			error: `firecrawl_crawl: ${message}`,
			searchId,
			crawlId: crawlRow.id,
			selectedUrl: seedUrl,
		};
	}
}

export type NpiWebSearchHit = {
	url: string;
	title?: string;
	description?: string;
};

export async function searchWebsitesForNpi(
	rawNpi: string,
	limit = 10,
): Promise<{ searchQuery: string; web: NpiWebSearchHit[]; error?: string }> {
	const npi = normalizeNpi(rawNpi);
	if (!npi) {
		return { searchQuery: "", web: [], error: "invalid_npi" };
	}

	let registry: NppesRegistryApiSuccess;
	try {
		registry = await fetchNpiByNumber(npi);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { searchQuery: "", web: [], error: `npi_fetch: ${message}` };
	}

	if (registryResultCount(registry) === 0) {
		return { searchQuery: "", web: [] };
	}

	const searchQuery = buildWebsiteSearchQuery(registry);
	if (!searchQuery) {
		return { searchQuery: "", web: [] };
	}

	try {
		const { data } = await searchDoctorWebsite({ query: searchQuery, limit });
		const webRaw = data.web;
		const web: NpiWebSearchHit[] = [];
		if (Array.isArray(webRaw)) {
			for (const item of webRaw) {
				const p = npiWebSearchHitSchema.safeParse(item);
				if (p.success && p.data.url) {
					web.push({
						url: p.data.url,
						title: p.data.title,
						description: p.data.description,
					});
				}
			}
		}
		return { searchQuery, web };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { searchQuery, web: [], error: `firecrawl_search: ${message}` };
	}
}

/** Run Firecrawl web search with an explicit query (no NPI fetch). */
export async function searchWebsitesWithQuery(
	query: string,
	limit = 10,
): Promise<{ searchQuery: string; web: NpiWebSearchHit[]; error?: string }> {
	const trimmed = query.trim();
	if (!trimmed) {
		return { searchQuery: "", web: [], error: "empty_query" };
	}
	try {
		const { data } = await searchDoctorWebsite({ query: trimmed, limit });
		const webRaw = data.web;
		const web: NpiWebSearchHit[] = [];
		if (Array.isArray(webRaw)) {
			for (const item of webRaw) {
				const p = npiWebSearchHitSchema.safeParse(item);
				if (p.success && p.data.url) {
					web.push({
						url: p.data.url,
						title: p.data.title,
						description: p.data.description,
					});
				}
			}
		}
		return { searchQuery: trimmed, web };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return {
			searchQuery: trimmed,
			web: [],
			error: `firecrawl_search: ${message}`,
		};
	}
}

/**
 * Crawl a user-selected practice URL (after web search). Stores search row + crawl.
 */
export async function enrichDoctorFromSeedUrl(
	rawNpi: string,
	seedUrl: string,
	options?: { title?: string; description?: string },
): Promise<EnrichmentResult> {
	const steps: EnrichmentStep[] = [];
	const npi = normalizeNpi(rawNpi);
	if (!npi) {
		return { npi: rawNpi, steps, error: "invalid_npi" };
	}

	const trimmedUrl = seedUrl.trim();
	if (!trimmedUrl) {
		return { npi, steps, error: "empty_seed_url" };
	}

	const reg = await fetchAndStoreNpiRegistry(npi, steps);
	if (!reg.ok) {
		return reg.result;
	}

	const firecrawlResponse: Record<string, unknown> =
		options?.title != null || options?.description != null
			? {
					web: [
						{
							url: trimmedUrl,
							title: options.title ?? "",
							description: options.description ?? "",
						},
					],
				}
			: {};

	const [searchRow] = await db
		.insert(doctorWebsiteSearch)
		.values({
			npi,
			searchQuery: "(user-selected url)",
			firecrawlRequest: { manual: true, seedUrl: trimmedUrl },
			firecrawlResponse,
			selectedUrl: trimmedUrl,
		})
		.returning({ id: doctorWebsiteSearch.id });

	const searchId = searchRow.id;
	steps.push("search_stored");

	return runCrawlForSelectedUrl(npi, searchId, trimmedUrl, steps);
}

export async function enrichDoctorByNpi(
	rawNpi: string,
): Promise<EnrichmentResult> {
	const steps: EnrichmentStep[] = [];
	const npi = normalizeNpi(rawNpi);
	if (!npi) {
		return {
			npi: rawNpi,
			steps,
			error: "invalid_npi",
		};
	}

	const reg = await fetchAndStoreNpiRegistry(npi, steps);
	if (!reg.ok) {
		return reg.result;
	}
	const registry = reg.registry;

	const searchQuery = buildWebsiteSearchQuery(registry);
	if (!searchQuery) {
		steps.push("skipped_no_query");
		const [row] = await db
			.insert(doctorWebsiteSearch)
			.values({
				npi,
				searchQuery: "",
				firecrawlRequest: { skipped: true, reason: "empty_query" },
				firecrawlResponse: {},
				selectedUrl: null,
			})
			.returning({ id: doctorWebsiteSearch.id });
		return {
			npi,
			steps,
			searchId: row?.id,
		};
	}

	let searchId: string;
	let selectedUrl: string | null = null;

	try {
		const { request, data } = await searchDoctorWebsite({
			query: searchQuery,
			limit: 5,
		});
		selectedUrl = firstWebSearchUrl(data);
		const [row] = await db
			.insert(doctorWebsiteSearch)
			.values({
				npi,
				searchQuery,
				firecrawlRequest: request,
				firecrawlResponse: jsonValueToRecord(data),
				selectedUrl,
			})
			.returning({ id: doctorWebsiteSearch.id });
		searchId = row.id;
		steps.push("search_stored");
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		const [row] = await db
			.insert(doctorWebsiteSearch)
			.values({
				npi,
				searchQuery,
				firecrawlRequest: { query: searchQuery, limit: 5, sources: ["web"] },
				firecrawlResponse: { error: message },
				selectedUrl: null,
			})
			.returning({ id: doctorWebsiteSearch.id });
		searchId = row.id;
		steps.push("search_stored");
		return {
			npi,
			steps,
			error: `firecrawl_search: ${message}`,
			searchId,
			selectedUrl: null,
		};
	}

	if (!selectedUrl) {
		steps.push("skipped_no_search_url");
		return { npi, steps, searchId, selectedUrl: null };
	}

	return runCrawlForSelectedUrl(npi, searchId, selectedUrl, steps);
}

export async function enrichDoctorsByNpis(
	npis: string[],
): Promise<EnrichmentResult[]> {
	const out: EnrichmentResult[] = [];
	for (const n of npis) {
		out.push(await enrichDoctorByNpi(n));
	}
	return out;
}
