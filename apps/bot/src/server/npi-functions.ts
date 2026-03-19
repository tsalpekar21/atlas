import { apiErrorBodySchema } from "@atlas/schemas/api";
import {
	doctorSiteCrawlDetailSchema,
	doctorSiteCrawlsResponseSchema,
	type NpiEnrichApiResult,
	npiEnrichResponseSchema,
	npiProvidersResponseSchema,
	npiWebSearchResponseSchema,
} from "@atlas/schemas/npi";
import { createServerFn } from "@tanstack/react-start";
import { api } from "@/lib/mastra-client";

export type { NpiEnrichApiResult };

export type NpiSearchInput = {
	providerName?: string;
	npi?: string;
	city?: string;
	state?: string;
	specialty?: string;
	limit: number;
	skip: number;
};

async function jsonWithErrorMessage(res: Response): Promise<unknown> {
	const raw: unknown = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = apiErrorBodySchema.safeParse(raw);
		throw new Error(
			err.success && err.data.error ? err.data.error : res.statusText,
		);
	}
	return raw;
}

function npiProviderQueryFromInput(
	data: NpiSearchInput,
): Parameters<(typeof api)["npi"]["providers"]["$get"]>[0]["query"] {
	const q: Record<string, string> = {
		limit: String(data.limit),
		skip: String(data.skip),
	};
	if (data.providerName) q.providerName = data.providerName;
	if (data.npi) q.npi = data.npi;
	if (data.city) q.city = data.city;
	if (data.state) q.state = data.state;
	if (data.specialty) q.specialty = data.specialty;
	return q as Parameters<(typeof api)["npi"]["providers"]["$get"]>[0]["query"];
}

export const fetchNpiProviders = createServerFn({ method: "POST" })
	.inputValidator((data: NpiSearchInput) => data)
	// @ts-expect-error Zod parse output uses `unknown` index signatures; Register expects `{}`.
	.handler(async ({ data }) => {
		const res = await api.npi.providers.$get({
			query: npiProviderQueryFromInput(data),
		});
		const json = await jsonWithErrorMessage(res);
		return npiProvidersResponseSchema.parse(json);
	});

export const fetchNpiWebSearch = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { npi: string; limit?: number; queryOverride?: string }) => data,
	)
	.handler(async ({ data }) => {
		const res = await api.npi["web-search"].$post({
			json: {
				npi: data.npi,
				limit: data.limit ?? 10,
				queryOverride: data.queryOverride?.trim() || undefined,
			},
		});
		const json = await jsonWithErrorMessage(res);
		return npiWebSearchResponseSchema.parse(json);
	});

export const triggerNpiEnrich = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			npi: string;
			seedUrl: string;
			title?: string;
			description?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const res = await api.npi.enrich.$post({
			json: {
				npi: data.npi,
				seedUrl: data.seedUrl,
				title: data.title,
				description: data.description,
			},
		});
		const json = await jsonWithErrorMessage(res);
		return npiEnrichResponseSchema.parse(json);
	});

export const fetchDoctorSiteCrawls = createServerFn({ method: "GET" })
	.inputValidator((data: { limit?: number } | undefined) => data ?? {})
	// @ts-expect-error Zod parse output uses `unknown` index signatures; Register expects `{}`.
	.handler(async ({ data }) => {
		const res = await api.npi.crawls.$get(
			data.limit != null
				? { query: { limit: String(data.limit) } }
				: { query: {} },
		);
		const json = await jsonWithErrorMessage(res);
		return doctorSiteCrawlsResponseSchema.parse(json);
	});

export const fetchDoctorSiteCrawlById = createServerFn({ method: "GET" })
	.inputValidator((data: { crawlId: string }) => data)
	// @ts-expect-error Zod parse output uses `unknown` index signatures; Register expects `{}`.
	.handler(async ({ data }) => {
		const res = await api.npi.crawls[":crawlId"].$get({
			param: { crawlId: data.crawlId },
		});
		if (res.status === 404) {
			throw new Error("Crawl not found");
		}
		const json = await jsonWithErrorMessage(res);
		return doctorSiteCrawlDetailSchema.parse(json);
	});
