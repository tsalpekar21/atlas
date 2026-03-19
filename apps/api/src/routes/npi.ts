import { logger } from "@atlas/logger";
import { npiCrawlsQuerySchema, npiProvidersQuerySchema } from "@atlas/schemas/npi";
import { zValidator } from "@hono/zod-validator";
import type { HonoBindings, HonoVariables } from "@mastra/hono";
import { Hono } from "hono";
import { z } from "zod";
import {
	enrichNpiFromUrl,
	getDoctorSiteCrawlById,
	listDoctorSiteCrawls,
	runNpiWebSearch,
	searchNpiProviders,
} from "../services/npi.ts";

export const npiRoutes = new Hono<{
	Bindings: HonoBindings;
	Variables: HonoVariables;
}>()
	.get("/npi/crawls", zValidator("query", npiCrawlsQuerySchema), async (c) => {
		const query = c.req.valid("query");
		const data = await listDoctorSiteCrawls({ limit: query.limit });
		return c.json(data);
	})
	.get(
		"/npi/crawls/:crawlId",
		zValidator("param", z.object({ crawlId: z.uuid() })),
		async (c) => {
			const { crawlId } = c.req.valid("param");
			const row = await getDoctorSiteCrawlById(crawlId);
			if (!row) {
				return c.json({ error: "Crawl not found" }, 404);
			}
			return c.json(row);
		},
	)
	.get(
		"/npi/providers",
		zValidator("query", npiProvidersQuerySchema),
		async (c) => {
			const query = c.req.valid("query");
			const result = await searchNpiProviders(query);
			if ("error" in result) {
				return c.json({ error: result.error }, result.status);
			}
			return c.json(result);
		},
	)
	.post(
		"/npi/web-search",
		zValidator(
			"json",
			z.object({
				npi: z.string().min(1),
				limit: z.number().int().min(1).max(20).optional(),
				queryOverride: z.string().trim().optional(),
			}),
		),
		async (c) => {
			const body = c.req.valid("json");
			logger.info(
				`NPI web search: ${body.npi}, limit: ${body.limit ?? 10}, queryOverride: ${body.queryOverride?.trim()}`,
			);
			const result = await runNpiWebSearch(body);
			if ("status" in result) {
				return c.json(result.body, result.status);
			}
			return c.json(result);
		},
	)
	.post(
		"/npi/enrich",
		zValidator(
			"json",
			z.object({
				npi: z.string().min(1),
				seedUrl: z.string().url(),
				title: z.string().optional(),
				description: z.string().optional(),
			}),
		),
		async (c) => {
			const body = c.req.valid("json");
			const data = await enrichNpiFromUrl(body);
			return c.json(data);
		},
	);
