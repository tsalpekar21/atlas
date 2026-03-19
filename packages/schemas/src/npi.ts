import { z } from "zod";
import {
	type NppesProviderResult,
	nppesProviderResultSchema,
} from "./nppes-registry.js";

export * from "./nppes-registry.js";

export const npiDataStatusSchema = z.enum([
	"verified",
	"pending_crawl",
	"crawling",
]);

export type NpiDataStatus = z.infer<typeof npiDataStatusSchema>;

export const npiProviderEnrichmentSchema = z.object({
	dataStatus: npiDataStatusSchema,
	selectedUrl: z.string().optional(),
	webTitle: z.string().optional(),
	webDescription: z.string().optional(),
	crawlCompleted: z.number().optional(),
	crawlTotal: z.number().optional(),
});

export type NpiProviderEnrichment = z.infer<typeof npiProviderEnrichmentSchema>;

/** One NPPES `results[]` entry (full provider object). Same as `NppesProviderResult`. */
export type NpiRegistryRecord = NppesProviderResult;

const npiRegistryRecordSchema = nppesProviderResultSchema;

export const npiProviderRowSchema = z.object({
	npi: z.string(),
	/** From basic.authorized_official_first_name / authorized_official_last_name. */
	providerName: z.string(),
	/** From basic.authorized_official_title_or_position. */
	title: z.string(),
	specialty: z.string(),
	/** Suggested Firecrawl search query for this provider (editable in UI). */
	searchQuery: z.string(),
	/** Complete NPPES payload for this row (all fields returned by CMS). */
	registry: npiRegistryRecordSchema,
	enrichment: npiProviderEnrichmentSchema,
});

export type NpiProviderRow = z.infer<typeof npiProviderRowSchema>;

function parseProviderNameParts(raw: string | undefined): {
	first_name?: string;
	last_name?: string;
} {
	const t = (raw ?? "").trim();
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

export const npiProvidersQuerySchema = z
	.object({
		providerName: z.preprocess(
			(v) => (v === "" || v == null ? undefined : String(v)),
			z.string().optional(),
		),
		npi: z.preprocess(
			(v) => (v === "" || v == null ? undefined : String(v)),
			z.string().optional(),
		),
		city: z.preprocess(
			(v) => (v === "" || v == null ? undefined : String(v)),
			z.string().optional(),
		),
		state: z.preprocess(
			(v) => (v === "" || v == null ? undefined : String(v)),
			z
				.string()
				.optional()
				.transform((s) => {
					if (!s?.trim()) return undefined;
					const u = s.trim().toUpperCase();
					return u.length >= 2 ? u.slice(0, 2) : undefined;
				}),
		),
		/** Maps to NPPES `taxonomy_description` (e.g. Cardiology, Family Medicine). */
		specialty: z.preprocess((v) => {
			if (v === "" || v == null) return undefined;
			const t = String(v).trim();
			return t === "" ? undefined : t;
		}, z.string().min(1).optional()),
		limit: z.coerce.number().int().min(1).max(200).default(20),
		skip: z.coerce.number().int().min(0).default(0),
	})
	.superRefine((data, ctx) => {
		const digits = (data.npi ?? "").replace(/\D/g, "");
		const hasNpi = digits.length === 10;
		const { first_name, last_name } = parseProviderNameParts(data.providerName);
		const hasName = Boolean(first_name || last_name);
		const hasCity = Boolean(data.city?.trim());
		const hasState = Boolean(data.state);
		const hasSpecialty = Boolean(data.specialty?.trim());
		if (!hasNpi && !hasName && !hasCity && !hasState && !hasSpecialty) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Provide at least one of: 10-digit NPI, provider name, city, state, or specialty",
			});
		}
	});

export type NpiProvidersQuery = z.infer<typeof npiProvidersQuerySchema>;

export const npiProvidersResponseSchema = z.object({
	skip: z.number(),
	limit: z.number(),
	/** True when this page is full — more results may exist (NPPES does not expose total count). */
	hasMore: z.boolean(),
	hasPrevious: z.boolean(),
	results: z.array(npiProviderRowSchema),
});

export type NpiProvidersResponse = z.infer<typeof npiProvidersResponseSchema>;

/** One Firecrawl web search hit (practice website candidate). */
export const npiWebSearchHitSchema = z.object({
	url: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
});

export type NpiWebSearchHit = z.infer<typeof npiWebSearchHitSchema>;

export const npiWebSearchResponseSchema = z.object({
	searchQuery: z.string(),
	web: z.array(npiWebSearchHitSchema),
});

export type NpiWebSearchResponse = z.infer<typeof npiWebSearchResponseSchema>;

/** Stored Firecrawl search payload on `doctor_website_search.firecrawl_response`. */
export const storedFirecrawlWebItemSchema = z
	.object({
		url: z.string().optional(),
		title: z.string().optional(),
		description: z.string().optional(),
	})
	.passthrough();

export const storedFirecrawlSearchResponseSchema = z
	.object({
		web: z.array(storedFirecrawlWebItemSchema).optional(),
	})
	.passthrough();

export type StoredFirecrawlSearchResponse = z.infer<
	typeof storedFirecrawlSearchResponseSchema
>;

/** Stored crawl status JSON on `doctor_site_crawl.crawl_status_final`. */
export const storedCrawlStatusFinalSchema = z
	.object({
		status: z.string().optional(),
		completed: z.number().optional(),
		total: z.number().optional(),
		error: z.unknown().optional(),
		id: z.string().optional(),
	})
	.passthrough();

export type StoredCrawlStatusFinal = z.infer<
	typeof storedCrawlStatusFinalSchema
>;

export const npiEnrichApiResultSchema = z.object({
	npi: z.string(),
	steps: z.array(z.string()),
	error: z.string().optional(),
	searchId: z.string().optional(),
	crawlId: z.string().optional(),
	selectedUrl: z.string().nullable().optional(),
});

export type NpiEnrichApiResult = z.infer<typeof npiEnrichApiResultSchema>;

export const npiEnrichResponseSchema = z.object({
	results: z.array(npiEnrichApiResultSchema),
});

export type NpiEnrichResponse = z.infer<typeof npiEnrichResponseSchema>;

/** Slim row for GET /npi/crawls (no page bodies). */
export const doctorSiteCrawlListRowSchema = z.object({
	id: z.string(),
	npi: z.string(),
	searchId: z.string(),
	seedUrl: z.string(),
	firecrawlJobId: z.string().nullable(),
	crawlStatusFinal: storedCrawlStatusFinalSchema,
	pageCount: z.number().int().nonnegative(),
	createdAt: z.union([z.string(), z.coerce.date()]).transform((v) =>
		v instanceof Date ? v.toISOString() : v,
	),
});

export type DoctorSiteCrawlListRow = z.infer<typeof doctorSiteCrawlListRowSchema>;

export const npiCrawlsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(500).optional(),
});

export type NpiCrawlsQuery = z.infer<typeof npiCrawlsQuerySchema>;

export const doctorSiteCrawlsResponseSchema = z.object({
	crawls: z.array(doctorSiteCrawlListRowSchema),
});

export type DoctorSiteCrawlsResponse = z.infer<
	typeof doctorSiteCrawlsResponseSchema
>;

/** One scraped page stored on `doctor_site_crawl.pages`. */
export const doctorSiteCrawlPageSchema = z
	.object({
		sourceURL: z.string().optional(),
		markdown: z.string().optional(),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

export type DoctorSiteCrawlPage = z.infer<typeof doctorSiteCrawlPageSchema>;

/** Full crawl row including page bodies (GET /npi/crawls/:id). */
export const doctorSiteCrawlDetailSchema = z.object({
	id: z.string(),
	npi: z.string(),
	searchId: z.string(),
	seedUrl: z.string(),
	firecrawlJobId: z.string().nullable(),
	crawlStatusFinal: storedCrawlStatusFinalSchema,
	pages: z.array(doctorSiteCrawlPageSchema),
	createdAt: z.union([z.string(), z.coerce.date()]).transform((v) =>
		v instanceof Date ? v.toISOString() : v,
	),
});

export type DoctorSiteCrawlDetail = z.infer<typeof doctorSiteCrawlDetailSchema>;
