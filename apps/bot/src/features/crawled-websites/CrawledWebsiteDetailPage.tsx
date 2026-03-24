"use client";

import type {
	DoctorSiteCrawlDetail,
	DoctorSiteCrawlPage,
	StoredCrawlStatusFinal,
} from "@atlas/schemas/npi";
import { Badge } from "@atlas/subframe/components/Badge";
import { Button } from "@atlas/subframe/components/Button";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { IconWithBackground } from "@atlas/subframe/components/IconWithBackground";
import { TextField } from "@atlas/subframe/components/TextField";
import {
	FeatherCheck,
	FeatherChevronLeft,
	FeatherExternalLink,
	FeatherFileText,
	FeatherSearch,
} from "@subframe/core";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { fetchDoctorSiteCrawlById } from "@/server/npi-functions.ts";
import { CrawlMarkdownBody } from "./CrawlMarkdownBody.tsx";
import { crawlStatusLabel } from "./crawlStatusLabel.ts";

function seedHostname(seedUrl: string): string {
	try {
		return new URL(seedUrl).hostname;
	} catch {
		return seedUrl;
	}
}

function pagePathDisplay(page: DoctorSiteCrawlPage): string {
	const url = page.sourceURL;
	if (typeof url === "string" && url.trim()) {
		try {
			const u = new URL(url);
			const path = u.pathname + (u.search || "") || "/";
			return path.length > 72 ? `${path.slice(0, 69)}…` : path;
		} catch {
			return url.slice(0, 72);
		}
	}
	return "—";
}

function metaTitle(page: DoctorSiteCrawlPage): string | undefined {
	const m = page.metadata;
	if (!m || typeof m !== "object") return undefined;
	const t = (m as Record<string, unknown>).title;
	return typeof t === "string" && t.trim() ? t.trim() : undefined;
}

function pageTitle(page: DoctorSiteCrawlPage, index: number): string {
	const fromMeta = metaTitle(page);
	if (fromMeta) return fromMeta;
	const md = page.markdown;
	if (typeof md === "string") {
		for (const line of md.split("\n")) {
			const t = line.trim();
			if (t.startsWith("#")) {
				return t.replace(/^#+\s*/, "").slice(0, 120) || `Page ${index + 1}`;
			}
		}
	}
	const path = pagePathDisplay(page);
	if (path && path !== "—") return path;
	return `Page ${index + 1}`;
}

function crawlStatusBadgeProps(s: StoredCrawlStatusFinal): {
	variant: "success" | "error" | "warning" | "neutral";
	label: string;
	showCheck: boolean;
} {
	const label = crawlStatusLabel(s);
	const status = typeof s.status === "string" ? s.status : "";
	if (status === "completed") {
		return { variant: "success", label, showCheck: true };
	}
	if (status === "failed" || s.error != null) {
		return { variant: "error", label, showCheck: false };
	}
	return { variant: "warning", label, showCheck: false };
}

function activePageUrl(
	pages: DoctorSiteCrawlDetail["pages"],
	pageIndex: number,
	seedUrl: string,
): string {
	const p = pages[pageIndex];
	const raw = p?.sourceURL;
	if (typeof raw === "string" && raw.trim()) return raw;
	return seedUrl;
}

export function CrawledWebsiteDetailPage() {
	const { crawlId } = useParams({
		from: "/crawled-websites/$crawlId",
	});
	const navigate = useNavigate();

	const query = useQuery({
		queryKey: ["doctor-site-crawl", crawlId],
		queryFn: (): Promise<DoctorSiteCrawlDetail> =>
			fetchDoctorSiteCrawlById({
				data: { crawlId },
			}),
	});

	const pages = query.data?.pages ?? [];
	const [pageIndex, setPageIndex] = useState(0);
	const [filter, setFilter] = useState("");

	const filteredIndices = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q) {
			return pages.map((_, i) => i);
		}
		return pages
			.map((p, i) => ({ p, i }))
			.filter(({ p, i }) => {
				const title = pageTitle(p, i).toLowerCase();
				const path = pagePathDisplay(p).toLowerCase();
				return title.includes(q) || path.includes(q);
			})
			.map(({ i }) => i);
	}, [pages, filter]);

	useEffect(() => {
		setPageIndex(0);
	}, [crawlId]);

	useEffect(() => {
		if (pages.length === 0) return;
		if (filteredIndices.length === 0) return;
		if (filteredIndices.includes(pageIndex)) return;
		const next = filteredIndices[0];
		if (next !== undefined) setPageIndex(next);
	}, [filteredIndices, pageIndex, pages.length]);

	const activeMarkdown = useMemo(() => {
		const p = pages[pageIndex];
		const raw = p?.markdown;
		return typeof raw === "string" ? raw : "";
	}, [pages, pageIndex]);

	const handleFilterChange = (value: string) => {
		setFilter(value);
		const q = value.trim().toLowerCase();
		const nextIndices = !q
			? pages.map((_, i) => i)
			: pages
					.map((p, i) => ({ p, i }))
					.filter(({ p, i }) => {
						const title = pageTitle(p, i).toLowerCase();
						const path = pagePathDisplay(p).toLowerCase();
						return title.includes(q) || path.includes(q);
					})
					.map(({ i }) => i);
		const first = nextIndices[0];
		if (first !== undefined) setPageIndex(first);
	};

	if (query.isError) {
		return (
			<div className="flex min-h-0 flex-1 flex-col bg-neutral-50 px-6 py-8">
				<div className="mx-auto w-full max-w-3xl">
					<Button
						variant="neutral-tertiary"
						size="small"
						icon={<FeatherChevronLeft />}
						onClick={() => navigate({ to: "/crawled-websites" })}
					>
						Back to list
					</Button>
					<p className="mt-6 text-body font-body text-error-700">
						{query.error instanceof Error
							? query.error.message
							: "Failed to load crawl"}
					</p>
				</div>
			</div>
		);
	}

	if (query.isLoading || !query.data) {
		return (
			<div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-default-background mobile:flex-col">
				<div className="flex flex-1 items-center justify-center px-6 py-12 text-body font-body text-subtext-color">
					Loading…
				</div>
			</div>
		);
	}

	const d = query.data;
	const statusBadge = crawlStatusBadgeProps(d.crawlStatusFinal);
	const activePage = pages[pageIndex];

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-default-background mobile:flex-col">
			<div className="flex min-h-0 min-w-0 flex-1 flex-row mobile:flex-col">
				{/* Left: crawl results list — matches Subframe Crawl Results Viewer */}
				<div className="flex w-80 max-w-full flex-none flex-col items-start self-stretch border-r border-solid border-neutral-border bg-neutral-50 mobile:w-full mobile:max-h-[min(40vh,320px)] mobile:border-r-0 mobile:border-b">
					<div className="flex w-full flex-col items-start gap-4 border-b border-solid border-neutral-border px-4 py-4">
						<Button
							variant="neutral-tertiary"
							size="small"
							className="-ml-1 self-start"
							icon={<FeatherChevronLeft />}
							onClick={() => navigate({ to: "/crawled-websites" })}
						>
							All crawls
						</Button>
						<div className="flex w-full flex-col items-start gap-1">
							<span className="text-heading-3 font-heading-3 text-default-font">
								Crawl results
							</span>
							<span className="text-caption font-caption text-subtext-color">
								NPI {d.npi} • {seedHostname(d.seedUrl)}
							</span>
						</div>
						<div className="flex w-full flex-wrap items-center gap-2">
							<Badge
								variant={statusBadge.variant}
								icon={statusBadge.showCheck ? <FeatherCheck /> : undefined}
							>
								{statusBadge.label}
							</Badge>
							<span className="text-caption font-caption text-subtext-color">
								{pages.length} page{pages.length === 1 ? "" : "s"} found
							</span>
						</div>
						<TextField
							className="h-auto w-full flex-none"
							variant="filled"
							label=""
							helpText=""
							icon={<FeatherSearch />}
						>
							<TextField.Input
								placeholder="Filter pages…"
								value={filter}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									handleFilterChange(e.target.value)
								}
							/>
						</TextField>
					</div>

					<div className="flex w-full min-h-0 flex-1 flex-col items-start overflow-y-auto">
						{pages.length === 0 ? (
							<div className="flex w-full flex-col px-4 py-6">
								<span className="text-caption font-caption text-subtext-color">
									No page content stored for this crawl.
								</span>
							</div>
						) : filteredIndices.length === 0 ? (
							<div className="flex w-full flex-col px-4 py-6">
								<span className="text-caption font-caption text-subtext-color">
									No pages match your filter.
								</span>
							</div>
						) : (
							filteredIndices.map((i) => {
								const p = pages[i];
								if (p === undefined) return null;
								const selected = i === pageIndex;
								return (
									<button
										key={`${d.id}-page-${i}`}
										type="button"
										onClick={() => setPageIndex(i)}
										className={
											selected
												? "flex w-full cursor-pointer flex-col items-start gap-0.5 border-l-2 border-solid border-brand-600 bg-brand-50 px-4 py-3 text-left transition-colors"
												: "flex w-full cursor-pointer flex-col items-start gap-0.5 border-l-2 border-solid border-transparent px-4 py-3 text-left transition-colors hover:bg-neutral-100"
										}
									>
										<span
											className={
												selected
													? "line-clamp-2 w-full text-body-bold font-body-bold text-brand-700"
													: "line-clamp-2 w-full text-body-bold font-body-bold text-default-font"
											}
										>
											{pageTitle(p, i)}
										</span>
										<span className="line-clamp-1 w-full text-caption font-caption text-subtext-color">
											{pagePathDisplay(p)}
										</span>
									</button>
								);
							})
						)}
					</div>
				</div>

				{/* Right: page viewer */}
				<div className="flex min-h-0 min-w-0 flex-1 flex-col items-start self-stretch overflow-hidden bg-default-background">
					<div className="flex w-full shrink-0 items-center gap-4 border-b border-solid border-neutral-border px-6 py-4 mobile:flex-col mobile:items-stretch mobile:gap-3">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<IconWithBackground
								variant="brand"
								size="medium"
								icon={<FeatherFileText />}
							/>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="line-clamp-2 w-full text-body-bold font-body-bold text-default-font">
									{activePage ? pageTitle(activePage, pageIndex) : "—"}
								</span>
								<span className="line-clamp-2 w-full break-all text-caption font-caption text-subtext-color">
									{activePageUrl(pages, pageIndex, d.seedUrl)}
								</span>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2 mobile:w-full mobile:justify-end">
							<IconButton
								icon={<FeatherExternalLink />}
								onClick={() => {
									const url = activePageUrl(pages, pageIndex, d.seedUrl);
									window.open(url, "_blank", "noopener,noreferrer");
								}}
							/>
						</div>
					</div>

					<section className="min-h-0 w-full flex-1 overflow-y-auto bg-default-background">
						<div className="mx-auto flex w-full max-w-[768px] flex-col gap-6 px-8 py-8 mobile:px-4 mobile:py-6">
							{activeMarkdown.trim() ? (
								<CrawlMarkdownBody markdown={activeMarkdown} />
							) : (
								<p className="text-body font-body text-subtext-color">
									No markdown for this page.
								</p>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
