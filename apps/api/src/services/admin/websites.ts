import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { chunks, scrapedPages, scrapedWebsites } from "../../db/schema.ts";

export async function listAdminWebsites() {
	const rows = await db
		.select({
			id: scrapedWebsites.id,
			title: scrapedWebsites.title,
			rootDomain: scrapedWebsites.rootDomain,
			pageCount: count(scrapedPages.id),
			createdAt: scrapedWebsites.createdAt,
		})
		.from(scrapedWebsites)
		.leftJoin(
			scrapedPages,
			eq(scrapedPages.scrapedWebsiteId, scrapedWebsites.id),
		)
		.groupBy(scrapedWebsites.id)
		.orderBy(desc(scrapedWebsites.createdAt));

	return rows.map((r) => ({
		...r,
		createdAt: r.createdAt.toISOString(),
	}));
}

function pathFromUrl(url: string): string {
	try {
		const u = new URL(url);
		return `${u.pathname}${u.search}` || "/";
	} catch {
		return url;
	}
}

export async function getAdminWebsiteDetail(websiteId: string) {
	const [website] = await db
		.select({
			id: scrapedWebsites.id,
			title: scrapedWebsites.title,
			rootDomain: scrapedWebsites.rootDomain,
			createdAt: scrapedWebsites.createdAt,
		})
		.from(scrapedWebsites)
		.where(eq(scrapedWebsites.id, websiteId))
		.limit(1);

	if (!website) return null;

	const pageRows = await db
		.select({
			id: scrapedPages.id,
			url: scrapedPages.url,
			title: scrapedPages.title,
			scrapedAt: scrapedPages.scrapedAt,
			chunkCount: count(chunks.id),
		})
		.from(scrapedPages)
		.leftJoin(chunks, eq(chunks.scrapedPageId, scrapedPages.id))
		.where(eq(scrapedPages.scrapedWebsiteId, websiteId))
		.groupBy(scrapedPages.id)
		.orderBy(asc(scrapedPages.url));

	return {
		website: {
			...website,
			createdAt: website.createdAt.toISOString(),
		},
		pages: pageRows.map((p) => ({
			id: p.id,
			path: pathFromUrl(p.url),
			title: p.title,
			chunkCount: p.chunkCount,
			scrapedAt: p.scrapedAt.toISOString(),
		})),
	};
}
