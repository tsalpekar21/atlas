import type { StoredCrawlStatusFinal } from "@atlas/schemas/npi";

export function crawlStatusLabel(
	crawlStatusFinal: StoredCrawlStatusFinal,
): string {
	const status =
		typeof crawlStatusFinal.status === "string" ? crawlStatusFinal.status : "";
	if (status === "scraping") return "Crawling";
	if (status === "completed") return "Completed";
	if (status === "failed") return "Failed";
	if (crawlStatusFinal.error != null) return "Failed";
	return status || "—";
}
