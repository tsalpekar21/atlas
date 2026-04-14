import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@atlas/logger";
import { Hono } from "hono";
import * as z from "zod";
import { db } from "../../db/index.ts";
import { scrapedPages } from "../../db/schema.ts";
import { env } from "../../env.ts";

// ---------------------------------------------------------------------------
// Zod schema — validate top-level shape only; `data` varies by event
// ---------------------------------------------------------------------------

const webhookPayloadSchema = z.object({
	success: z.boolean(),
	type: z.string(),
	id: z.string(),
	data: z.array(z.unknown()),
	metadata: z.record(z.string(), z.unknown()).optional(),
	error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signatureHeader: string): boolean {
	const [algo, hash] = signatureHeader.split("=");
	if (algo !== "sha256" || !hash) return false;

	const expected = createHmac("sha256", env.FIRECRAWL_WEBHOOK_SECRET)
		.update(rawBody)
		.digest("hex");

	try {
		return timingSafeEqual(
			Buffer.from(hash, "hex"),
			Buffer.from(expected, "hex"),
		);
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const firecrawlWebhookRoutes = new Hono().post("", async (c) => {
	// Verify signature using raw body
	const rawBody = await c.req.text();
	const signature = c.req.header("x-firecrawl-signature");

	if (!signature || !verifySignature(rawBody, signature)) {
		logger.warn("Firecrawl webhook signature verification failed");
		return c.json({ error: "Invalid signature" }, 401);
	}

	const parsed = webhookPayloadSchema.safeParse(JSON.parse(rawBody));
	if (!parsed.success) {
		logger.warn(
			{ error: parsed.error.message },
			"Firecrawl webhook payload validation failed",
		);
		return c.json({ error: "Invalid payload" }, 400);
	}

	const { type, id, data, error } = parsed.data;
	logger.info({ type, jobId: id }, "Firecrawl webhook received");

	if (type.endsWith(".page")) {
		let upserted = 0;
		for (const item of data) {
			const doc = item as {
				markdown?: string;
				metadata?: {
					title?: string;
					description?: string;
					url?: string;
					[k: string]: unknown;
				};
			};

			const url = doc.metadata?.url;
			if (!url) continue;

			await db
				.insert(scrapedPages)
				.values({
					url,
					title: doc.metadata?.title ?? null,
					description: doc.metadata?.description ?? null,
					markdown: doc.markdown ?? null,
					metadata: doc.metadata ?? null,
				})
				.onConflictDoUpdate({
					target: scrapedPages.url,
					set: {
						title: doc.metadata?.title ?? null,
						description: doc.metadata?.description ?? null,
						markdown: doc.markdown ?? null,
						metadata: doc.metadata ?? null,
					},
				});

			upserted++;
			logger.info({ url }, "Firecrawl page upserted");
		}
		logger.info({ jobId: id, upserted }, "Firecrawl page event processed");
	} else if (type.endsWith(".completed")) {
		logger.info({ jobId: id }, "Firecrawl job completed");
	} else if (type.endsWith(".started")) {
		logger.info({ jobId: id }, "Firecrawl job started");
	} else if (type.endsWith(".failed")) {
		logger.error({ jobId: id, error }, "Firecrawl job failed");
	}

	return c.json({ received: true });
});
