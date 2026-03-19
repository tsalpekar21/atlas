import { apiErrorBodySchema } from "@atlas/schemas/api";
import {
	type NpiEnrichApiResult,
	npiEnrichResponseSchema,
	npiProvidersResponseSchema,
	npiWebSearchResponseSchema,
} from "@atlas/schemas/npi";
import { createServerFn } from "@tanstack/react-start";

const base = process.env.SERVER_URL ?? "http://localhost:4111";

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

export const fetchNpiProviders = createServerFn({ method: "POST" })
	.inputValidator((data: NpiSearchInput) => data)
	// @ts-expect-error Zod parse output uses `unknown` index signatures; Register expects `{}`.
	.handler(async ({ data }) => {
		const u = new URL("/npi/providers", base);
		for (const [k, v] of Object.entries(data)) {
			if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
		}
		const headers: Record<string, string> = {};
		if (process.env.API_TOKEN) {
			headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
		}
		const res = await fetch(u.toString(), { headers });
		if (!res.ok) {
			const raw: unknown = await res.json().catch(() => ({}));
			const err = apiErrorBodySchema.safeParse(raw);
			throw new Error(
				err.success && err.data.error ? err.data.error : res.statusText,
			);
		}
		const json = await res.json();
		return npiProvidersResponseSchema.parse(json);
	});

export const fetchNpiWebSearch = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { npi: string; limit?: number; queryOverride?: string }) => data,
	)
	.handler(async ({ data }) => {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (process.env.API_TOKEN) {
			headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
		}
		const res = await fetch(`${base}/npi/web-search`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				npi: data.npi,
				limit: data.limit ?? 10,
				queryOverride: data.queryOverride?.trim() || undefined,
			}),
		});
		const json: unknown = await res.json();
		if (!res.ok) {
			const err = apiErrorBodySchema.safeParse(json);
			throw new Error(
				err.success && err.data.error ? err.data.error : res.statusText,
			);
		}
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
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (process.env.API_TOKEN) {
			headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
		}
		const res = await fetch(`${base}/npi/enrich`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				npi: data.npi,
				seedUrl: data.seedUrl,
				title: data.title,
				description: data.description,
			}),
		});
		if (!res.ok) {
			const raw: unknown = await res.json().catch(() => ({}));
			const err = apiErrorBodySchema.safeParse(raw);
			throw new Error(
				err.success && err.data.error ? err.data.error : res.statusText,
			);
		}
		const json: unknown = await res.json();
		return npiEnrichResponseSchema.parse(json);
	});
