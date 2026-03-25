"use client";

import { CrawledWebsitesPage } from "@/features/crawled-websites/CrawledWebsitesPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/crawled-websites/")({
	head: () => ({
		meta: [{ title: "Crawled websites · Atlas" }],
	}),
	component: CrawledWebsitesPage,
});
