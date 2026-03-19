"use client";

import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for `/crawled-websites/*` so `/$crawlId` renders in an `<Outlet />`.
 * List UI: `crawled-websites/index.tsx`.
 */
export const Route = createFileRoute("/crawled-websites")({
	component: CrawledWebsitesLayout,
});

function CrawledWebsitesLayout() {
	return <Outlet />;
}
