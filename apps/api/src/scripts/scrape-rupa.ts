import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Firecrawl from "@mendable/firecrawl-js";
import { env } from "../env.ts";
import { db, schema } from "../db/index.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SCRAPE_LIMIT = Number(process.env.SCRAPE_LIMIT) || Infinity;
const WEBHOOK_URL = "https://api.atlashealth.dev/webhooks/firecrawl";

// ---------------------------------------------------------------------------
// Load sitemap and filter /post/ URLs
// ---------------------------------------------------------------------------

const sitemapPath = resolve(
	new URL(".", import.meta.url).pathname,
	"../src/data/rupa-health-sitemap.json",
);
const sitemap = JSON.parse(readFileSync(sitemapPath, "utf-8")) as {
	links: { url: string; title?: string; description?: string }[];
};

const postUrls = sitemap.links
	.filter((link) => link.url.includes("/post/"))
	.map((link) => link.url)
	.slice(0, SCRAPE_LIMIT);

console.log(
	`Sitemap: ${sitemap.links.length} total URLs, ${postUrls.length} /post/ URLs selected`,
);

// ---------------------------------------------------------------------------
// Firecrawl client
// ---------------------------------------------------------------------------

const firecrawl = new Firecrawl({
	apiKey: env.FIRECRAWL_API_KEY,
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	// Idempotency: filter out URLs already in the database
	const existing = await db
		.select({ url: schema.scrapedPages.url })
		.from(schema.scrapedPages);
	const existingUrls = new Set(existing.map((r) => r.url));

	const pending = postUrls.filter((u) => !existingUrls.has(u));
	console.log(
		`${existingUrls.size} already scraped, ${pending.length} remaining`,
	);

	if (pending.length === 0) {
		console.log("Nothing to scrape.");
		return;
	}

	console.log(`Starting batch scrape of ${pending.length} URLs…`);

	const { id, invalidURLs } = await firecrawl.startBatchScrape(pending, {
		options: {
			formats: ["markdown"],
			onlyMainContent: true,
			timeout: 60_000,
			waitFor: 10_000,
			maxAge: 604800000,
			proxy: "basic",
		},
		webhook: {
			url: WEBHOOK_URL,
			events: ["started", "page", "completed"],
		},
	});

	if (invalidURLs?.length) {
		console.warn(`${invalidURLs.length} invalid URLs skipped by Firecrawl`);
	}

	console.log(`Batch scrape started (id: ${id})`);
	console.log(`Webhook events will be delivered to ${WEBHOOK_URL}`);
	process.exit(0);
}

main().catch(async (err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
