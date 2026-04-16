import { randomUUID } from "node:crypto";
import { db } from "../../src/db/index.ts";
import { scrapedPages, scrapedWebsites } from "../../src/db/schema.ts";
import { embedPage } from "../../src/services/chunks/embed-page.ts";

/**
 * Deterministic RAG corpus seeder for integration tests.
 *
 * Inserts a small set of `scraped_pages` covering distinct
 * functional-medicine topics, then runs the real `embedPage()` pipeline
 * to populate the `chunks` table and the `page_chunks` PgVector index.
 *
 * **Important:** the caller MUST stub `embedMany` from the `ai` package
 * via `vi.mock("ai", ...)` BEFORE the test file's static imports resolve.
 * See `embed-page.test.ts:32-46` for the reference pattern — stubs
 * `embedMany` to return deterministic 3072-dim vectors biased per row
 * so cosine similarity is meaningful for assertions.
 *
 * Returns website + page + chunk IDs so downstream assertions can
 * target specific chunks. Cleanup via `cleanupWebsite()` in `afterAll`.
 */

export type SeededPage = {
	pageId: string;
	url: string;
	title: string;
	chunkIds: string[];
};

export type SeededCorpus = {
	websiteId: string;
	pages: SeededPage[];
};

/**
 * The 3 pages we seed. Content is long enough for the semantic-markdown
 * chunker to produce multiple chunks per page (so tests can exercise
 * MMR diversity). Topics are intentionally distinct so a query
 * matching one page's embedding axis doesn't accidentally match others.
 */
const SEED_PAGES = [
	{
		urlSlug: "sibo-root-causes",
		title: "SIBO Root Causes in Functional Medicine",
		markdown: `# SIBO Root Causes

## Overview
Small intestinal bacterial overgrowth (SIBO) is a functional GI condition driven by a combination of impaired motility, reduced stomach acid, and structural factors.

## Migrating motor complex dysfunction
The migrating motor complex (MMC) is the phase III cleansing wave that sweeps the small intestine between meals. When MMC is impaired — often after food poisoning, abdominal surgery, or chronic stress — bacteria accumulate and ferment carbohydrates.

## Stomach acid and bile insufficiency
Hypochlorhydria and inadequate bile flow fail to sterilize and alkalinize incoming food, allowing bacterial colonization further up the GI tract.

## Treatment protocols
Herbal antimicrobials (berberine, oregano oil, allicin), prokinetics (low-dose naltrexone, ginger), and elemental diets are first-line integrative options before rifaximin.`,
	},
	{
		urlSlug: "low-ferritin-interpretation",
		title: "Interpreting Low Ferritin in Functional Medicine",
		markdown: `# Low Ferritin Interpretation

## Reference ranges
Standard lab ranges for ferritin (12-150 ng/mL women, 20-500 men) include many functionally-iron-deficient patients. Functional medicine targets 70-100 ng/mL for optimal oxygen transport and energy.

## Causes of low ferritin
Iron deficiency from inadequate intake or absorption, chronic inflammation masking iron stores, and occult GI blood loss are the three primary drivers. Celiac and H. pylori should be ruled out in unexplained low ferritin.

## Supplementation approach
Iron bisglycinate or iron sulfate with vitamin C enhancement is typical. Monitor at 6-8 week intervals; over-supplementation risks oxidative stress.`,
	},
	{
		urlSlug: "cortisol-stress-axis",
		title: "The Cortisol Stress Axis and HPA Dysregulation",
		markdown: `# Cortisol and the HPA Axis

## Diurnal rhythm
Healthy cortisol peaks 30-45 minutes after waking (the CAR — cortisol awakening response) and declines through the day to a nadir near midnight. Flat or inverted curves signal HPA dysregulation.

## Measurement
Salivary or dried urine cortisol at 4 points across the day (upon waking, noon, evening, night) gives a functional picture that single morning serum draws miss.

## Lifestyle interventions
Adaptogenic herbs (ashwagandha, rhodiola), phosphatidylserine before bed for elevated evening cortisol, and sleep-timing normalization are first-line. Address underlying stressors first.`,
	},
];

export async function seedRagCorpus(): Promise<SeededCorpus> {
	const suffix = randomUUID();

	const [website] = await db
		.insert(scrapedWebsites)
		.values({
			title: `Test FM Corpus ${suffix}`,
			rootDomain: `test-fm-${suffix}.example.com`,
		})
		.returning({ id: scrapedWebsites.id });
	if (!website) throw new Error("seedRagCorpus: failed to insert website");

	const pages: SeededPage[] = [];
	for (const seed of SEED_PAGES) {
		const url = `https://test-fm-${suffix}.example.com/post/${seed.urlSlug}`;
		const [page] = await db
			.insert(scrapedPages)
			.values({
				url,
				title: seed.title,
				scrapedWebsiteId: website.id,
				markdown: seed.markdown,
			})
			.returning({ id: scrapedPages.id });
		if (!page) throw new Error(`seedRagCorpus: failed to insert ${seed.urlSlug}`);

		// Run the real embed pipeline. `embedMany` MUST be stubbed by the
		// caller via `vi.mock("ai", ...)` before this helper is imported.
		await embedPage(page.id);

		// Pull the chunk ids back from the DB after embedding finishes.
		const chunkRows = await db.query.chunks.findMany({
			where: (chunks, { eq }) => eq(chunks.scrapedPageId, page.id),
			columns: { id: true },
		});

		pages.push({
			pageId: page.id,
			url,
			title: seed.title,
			chunkIds: chunkRows.map((r) => r.id),
		});
	}

	return { websiteId: website.id, pages };
}

/**
 * Build a deterministic 3072-dim embedding biased along a specific
 * axis. Exported for test files that stub `embedMany` and want the
 * vectors for each query to be distinguishable.
 *
 * `axis` in [0, 5] produces vectors that land near-orthogonal to each
 * other (enough for cosine similarity to be a useful sorting signal
 * across the 3 seed pages).
 */
export function deterministicVector(axis: number, dim = 3072): number[] {
	const v = new Array(dim).fill(0);
	for (let i = 0; i < dim; i++) {
		// Per-axis phase shift so axis 0 peaks near index 0, axis 1 near
		// dim/6, axis 2 near dim/3, etc.
		const phase = (axis * Math.PI) / 3;
		v[i] = Math.cos((i * 2 * Math.PI) / dim + phase) * 0.5 + 0.5;
	}
	return v;
}
