"use client";

import { CrawledWebsiteDetailPage } from "@/features/crawled-websites/CrawledWebsiteDetailPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/crawled-websites/$crawlId")({
	head: () => ({
		meta: [{ title: "Doctor site crawl · Atlas" }],
	}),
	component: CrawledWebsiteDetailPage,
});
