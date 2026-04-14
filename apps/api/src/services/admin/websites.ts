import { count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { scrapedPages, scrapedWebsites } from "../../db/schema.ts";

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
