import type {
	DoctorSiteCrawlDetail,
	DoctorSiteCrawlListRow,
	DoctorSiteCrawlsResponse,
	NpiEnrichResponse,
	NpiProviderEnrichment,
	NpiProviderRow,
	NpiProvidersQuery,
	NpiProvidersResponse,
	NpiWebSearchResponse,
	NppesProviderResult,
} from "@atlas/schemas/npi";
import {
	isNppesRegistryError,
	parseNppesRegistryResponse,
	storedCrawlStatusFinalSchema,
	storedFirecrawlSearchResponseSchema,
} from "@atlas/schemas/npi";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { doctorSiteCrawl, doctorWebsiteSearch } from "../db/schema.ts";
import {
	enrichDoctorFromSeedUrl,
	searchWebsitesForNpi,
	searchWebsitesWithQuery,
} from "./doctor-enrichment-pipeline.ts";
import { buildWebsiteSearchQuery } from "./npi-registry.ts";

const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/";

function parseProviderName(raw: string): {
	first_name?: string;
	last_name?: string;
} {
	const t = raw.trim();
	if (!t) return {};
	if (t.includes(",")) {
		const [last, rest] = t.split(",").map((x) => x.trim());
		return {
			last_name: last || undefined,
			first_name: rest || undefined,
		};
	}
	const parts = t.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return { last_name: parts[0] };
	return {
		first_name: parts[0],
		last_name: parts.slice(1).join(" "),
	};
}

type CrawlRow = typeof doctorSiteCrawl.$inferSelect;
type SearchRow = typeof doctorWebsiteSearch.$inferSelect;

function webFromSearchRow(search: SearchRow | undefined): {
	selectedUrl?: string;
	webTitle?: string;
	webDescription?: string;
} {
	if (!search) return {};
	const parsed = storedFirecrawlSearchResponseSchema.safeParse(
		search.firecrawlResponse,
	);
	const selectedUrl = search.selectedUrl ?? undefined;
	if (!parsed.success) {
		return { selectedUrl: selectedUrl ?? undefined };
	}
	const web = parsed.data.web;
	const first = web?.[0];
	if (!first || typeof first !== "object") {
		return { selectedUrl: selectedUrl ?? undefined };
	}
	return {
		selectedUrl:
			(typeof first.url === "string" ? first.url : selectedUrl) ?? selectedUrl,
		webTitle: typeof first.title === "string" ? first.title : undefined,
		webDescription:
			typeof first.description === "string" ? first.description : undefined,
	};
}

function deriveEnrichment(
	crawl: CrawlRow | undefined,
	search: SearchRow | undefined,
): NpiProviderEnrichment {
	const fromSearch = webFromSearchRow(search);

	if (crawl) {
		const finalParsed = storedCrawlStatusFinalSchema.safeParse(
			crawl.crawlStatusFinal,
		);
		const final = finalParsed.success ? finalParsed.data : {};
		const status = typeof final.status === "string" ? final.status : "";

		if (status === "scraping") {
			return {
				dataStatus: "crawling",
				selectedUrl: crawl.seedUrl || fromSearch.selectedUrl,
				webTitle: fromSearch.webTitle,
				webDescription: fromSearch.webDescription,
				crawlCompleted:
					typeof final.completed === "number" ? final.completed : undefined,
				crawlTotal: typeof final.total === "number" ? final.total : undefined,
			};
		}

		const pages = crawl.pages;
		const pageCount = Array.isArray(pages) ? pages.length : 0;

		if (status === "completed" && pageCount > 0) {
			return {
				dataStatus: "verified",
				selectedUrl: crawl.seedUrl || fromSearch.selectedUrl,
				webTitle: fromSearch.webTitle,
				webDescription: fromSearch.webDescription,
			};
		}

		if (
			status === "failed" ||
			final.error ||
			(status === "completed" && pageCount === 0)
		) {
			return {
				dataStatus: "pending_crawl",
				...fromSearch,
			};
		}
	}

	if (fromSearch.selectedUrl) {
		return {
			dataStatus: "pending_crawl",
			...fromSearch,
		};
	}

	return { dataStatus: "pending_crawl" };
}

function mapRegistryResult(
	r: NppesProviderResult,
): Omit<NpiProviderRow, "enrichment"> {
	const basic = r.basic ?? {};
	const aoFirst =
		typeof basic.authorized_official_first_name === "string"
			? basic.authorized_official_first_name.trim()
			: "";
	const aoLast =
		typeof basic.authorized_official_last_name === "string"
			? basic.authorized_official_last_name.trim()
			: "";
	const providerName = [aoFirst, aoLast].filter(Boolean).join(" ") || "—";
	const titleRaw = basic.authorized_official_title_or_position;
	const title =
		typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : "—";

	const taxonomies = r.taxonomies;
	const tax = taxonomies?.find((t) => t.primary) ?? taxonomies?.[0];

	const registry = structuredClone(r);
	const searchQuery =
		buildWebsiteSearchQuery({ result_count: 1, results: [r] }) ?? "";

	return {
		npi: String(r.number ?? ""),
		providerName,
		title,
		specialty: tax?.desc ?? "—",
		searchQuery,
		registry,
	};
}

async function loadEnrichmentByNpis(
	npis: string[],
): Promise<Map<string, { crawl?: CrawlRow; search?: SearchRow }>> {
	const map = new Map<string, { crawl?: CrawlRow; search?: SearchRow }>();
	if (npis.length === 0) return map;

	const crawls = await db
		.select()
		.from(doctorSiteCrawl)
		.where(inArray(doctorSiteCrawl.npi, npis))
		.orderBy(desc(doctorSiteCrawl.createdAt));

	for (const row of crawls) {
		const cur = map.get(row.npi) ?? {};
		if (!cur.crawl) cur.crawl = row;
		map.set(row.npi, cur);
	}

	const searches = await db
		.select()
		.from(doctorWebsiteSearch)
		.where(inArray(doctorWebsiteSearch.npi, npis))
		.orderBy(desc(doctorWebsiteSearch.createdAt));

	for (const row of searches) {
		const cur = map.get(row.npi) ?? {};
		if (!cur.search) cur.search = row;
		map.set(row.npi, cur);
	}

	return map;
}

export type NpiServiceError = { error: string; status: 400 | 502 };

export async function searchNpiProviders(
	q: NpiProvidersQuery,
): Promise<NpiProvidersResponse | NpiServiceError> {
	const { providerName, npi, city, state, specialty, limit, skip } = q;

	const url = new URL(NPPES_BASE);
	url.searchParams.set("version", "2.1");
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("skip", String(skip));

	const digits = (npi ?? "").replace(/\D/g, "");
	const hasNpi = digits.length === 10;
	const { first_name, last_name } = parseProviderName(providerName ?? "");

	if (hasNpi) {
		url.searchParams.set("number", digits);
	} else {
		if (first_name) url.searchParams.set("first_name", first_name);
		if (last_name) url.searchParams.set("last_name", last_name);
	}
	if (city?.trim()) url.searchParams.set("city", city.trim());
	if (state) url.searchParams.set("state", state);
	if (specialty?.trim()) {
		url.searchParams.set("taxonomy_description", specialty.trim());
	}

	const res = await fetch(url.toString());
	if (!res.ok) {
		return { error: `NPPES upstream HTTP ${res.status}`, status: 502 };
	}

	let body: ReturnType<typeof parseNppesRegistryResponse>;
	try {
		body = parseNppesRegistryResponse(await res.json());
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error(message);
		return { error: "Invalid NPPES response", status: 502 };
	}
	if (isNppesRegistryError(body)) {
		const msg = body.Errors.map((e) => e.description ?? JSON.stringify(e)).join(
			"; ",
		);
		return { error: msg || "NPPES validation error", status: 400 };
	}

	const resultsRaw = body.results;
	const npis = resultsRaw.map((r) => String(r.number ?? "")).filter(Boolean);
	const enrichMap = await loadEnrichmentByNpis(npis);

	const results: NpiProviderRow[] = resultsRaw.map((r) => {
		const base = mapRegistryResult(r);
		const { crawl, search } = enrichMap.get(base.npi) ?? {};
		return {
			...base,
			enrichment: deriveEnrichment(crawl, search),
		};
	});

	const hasMore = resultsRaw.length >= limit && limit > 0;
	const hasPrevious = skip > 0;

	return {
		skip,
		limit,
		hasMore,
		hasPrevious,
		results,
	};
}

export type NpiWebSearchErrorBody = {
	error: string;
	searchQuery: string;
	web: NpiWebSearchResponse["web"];
};

export async function runNpiWebSearch(body: {
	npi: string;
	limit?: number;
	queryOverride?: string;
}): Promise<
	NpiWebSearchResponse | { status: 502; body: NpiWebSearchErrorBody }
> {
	const limit = body.limit ?? 10;
	const capped = Math.min(Math.max(1, limit), 20);
	const trimmedOverride = body.queryOverride?.trim();

	const { searchQuery, web, error } = trimmedOverride
		? await searchWebsitesWithQuery(trimmedOverride, capped)
		: await searchWebsitesForNpi(body.npi, capped);

	if (error?.startsWith("npi_fetch")) {
		return {
			status: 502,
			body: { error, searchQuery: "", web: [] },
		};
	}
	if (error?.startsWith("firecrawl") || error === "empty_query") {
		return {
			status: 502,
			body: {
				error: error ?? "firecrawl error",
				searchQuery: searchQuery || "",
				web: [],
			},
		};
	}

	return { searchQuery, web };
}

export async function enrichNpiFromUrl(body: {
	npi: string;
	seedUrl: string;
	title?: string;
	description?: string;
}): Promise<NpiEnrichResponse> {
	const result = await enrichDoctorFromSeedUrl(body.npi, body.seedUrl, {
		title: body.title,
		description: body.description,
	});
	return { results: [result] };
}

const MAX_CRAWLS_LIST = 500;

export async function listDoctorSiteCrawls(opts: {
	limit?: number;
}): Promise<DoctorSiteCrawlsResponse> {
	const limit = Math.min(
		Math.max(1, opts.limit ?? MAX_CRAWLS_LIST),
		MAX_CRAWLS_LIST,
	);

	const rows = await db
		.select({
			id: doctorSiteCrawl.id,
			npi: doctorSiteCrawl.npi,
			searchId: doctorSiteCrawl.searchId,
			seedUrl: doctorSiteCrawl.seedUrl,
			firecrawlJobId: doctorSiteCrawl.firecrawlJobId,
			crawlStatusFinal: doctorSiteCrawl.crawlStatusFinal,
			createdAt: doctorSiteCrawl.createdAt,
			pageCount: sql<number>`coalesce(jsonb_array_length(${doctorSiteCrawl.pages}), 0)::int`,
		})
		.from(doctorSiteCrawl)
		.orderBy(desc(doctorSiteCrawl.createdAt))
		.limit(limit);

	const crawls: DoctorSiteCrawlListRow[] = rows.map((r) => ({
		id: r.id,
		npi: r.npi,
		searchId: r.searchId,
		seedUrl: r.seedUrl,
		firecrawlJobId: r.firecrawlJobId,
		crawlStatusFinal: r.crawlStatusFinal as Record<string, unknown>,
		pageCount: Number(r.pageCount),
		createdAt:
			r.createdAt instanceof Date
				? r.createdAt.toISOString()
				: String(r.createdAt),
	}));

	return { crawls };
}

export async function getDoctorSiteCrawlById(
	id: string,
): Promise<DoctorSiteCrawlDetail | null> {
	const [row] = await db
		.select()
		.from(doctorSiteCrawl)
		.where(eq(doctorSiteCrawl.id, id))
		.limit(1);

	if (!row) return null;

	const pages = Array.isArray(row.pages) ? row.pages : [];

	return {
		id: row.id,
		npi: row.npi,
		searchId: row.searchId,
		seedUrl: row.seedUrl,
		firecrawlJobId: row.firecrawlJobId,
		crawlStatusFinal: row.crawlStatusFinal as DoctorSiteCrawlDetail["crawlStatusFinal"],
		pages,
		createdAt:
			row.createdAt instanceof Date
				? row.createdAt.toISOString()
				: String(row.createdAt),
	};
}
