import type { AdminChunk, AdminPageSummary } from "@atlas/schemas/api";
import { Badge } from "@atlas/subframe/components/Badge";
import { Breadcrumbs } from "@atlas/subframe/components/Breadcrumbs";
import { Button } from "@atlas/subframe/components/Button";
import { CopyToClipboardButton } from "@atlas/subframe/components/CopyToClipboardButton";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { TextField } from "@atlas/subframe/components/TextField";
import {
	FeatherAlertTriangle,
	FeatherArrowLeft,
	FeatherCheck,
	FeatherLoader,
	FeatherRefreshCw,
	FeatherSearch,
} from "@subframe/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	embedAdminPage,
	embedAdminWebsite,
	getAdminWebsiteDetail,
	listAdminPageChunks,
} from "@/lib/admin/admin-api-client";

export const Route = createFileRoute("/admin/websites/$websiteId")({
	head: () => ({
		meta: [{ title: "Admin · Website — Atlas Health" }],
	}),
	component: AdminWebsiteDetailPage,
});

function formatRelativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	const diffMs = Date.now() - then;
	const minute = 60_000;
	const hour = 3_600_000;
	const day = 86_400_000;
	if (diffMs < minute) return "just now";
	if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
	if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
	return `${Math.floor(diffMs / day)}d ago`;
}

function ChunkStatusBadge({ status }: { status: AdminChunk["status"] }) {
	if (status === "embedded") {
		return (
			<Badge variant="success" icon={<FeatherCheck />}>
				Embedded
			</Badge>
		);
	}
	if (status === "failed") {
		return (
			<Badge variant="error" icon={<FeatherAlertTriangle />}>
				Failed
			</Badge>
		);
	}
	return (
		<Badge variant="warning" icon={<FeatherLoader />}>
			Processing
		</Badge>
	);
}

function AdminWebsiteDetailPage() {
	const { websiteId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
	const [filter, setFilter] = useState("");

	const detailQuery = useQuery({
		queryKey: ["admin", "websites", websiteId],
		queryFn: () => getAdminWebsiteDetail(websiteId),
	});

	const pages: AdminPageSummary[] = useMemo(
		() => detailQuery.data?.pages ?? [],
		[detailQuery.data?.pages],
	);

	useEffect(() => {
		if (!selectedPageId && pages.length > 0) {
			setSelectedPageId(pages[0]?.id ?? null);
		}
	}, [pages, selectedPageId]);

	const filteredPages = useMemo(() => {
		if (!filter.trim()) return pages;
		const needle = filter.toLowerCase();
		return pages.filter((p) => p.path.toLowerCase().includes(needle));
	}, [pages, filter]);

	const chunksQuery = useQuery({
		queryKey: ["admin", "pages", selectedPageId, "chunks"],
		queryFn: () => {
			if (!selectedPageId) throw new Error("no page selected");
			return listAdminPageChunks(selectedPageId);
		},
		enabled: !!selectedPageId,
		// Poll while any chunk is still pending so "Processing" badges
		// flip to "Embedded" without a manual refresh.
		refetchInterval: (query) => {
			const data = query.state.data;
			if (!data) return false;
			return data.chunks.some((c) => c.status === "pending") ? 2000 : false;
		},
	});

	const embedMutation = useMutation({
		mutationFn: () => embedAdminWebsite(websiteId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["admin", "websites", websiteId],
			});
			if (selectedPageId) {
				queryClient.invalidateQueries({
					queryKey: ["admin", "pages", selectedPageId, "chunks"],
				});
			}
		},
	});

	const embedPageMutation = useMutation({
		mutationFn: (pageId: string) => embedAdminPage(pageId),
		onSuccess: (_data, pageId) => {
			queryClient.invalidateQueries({
				queryKey: ["admin", "websites", websiteId],
			});
			queryClient.invalidateQueries({
				queryKey: ["admin", "pages", pageId, "chunks"],
			});
		},
	});

	const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;
	const chunks: AdminChunk[] = chunksQuery.data?.chunks ?? [];

	return (
		<div className="flex h-full w-full flex-col items-start bg-neutral-50">
			<div className="flex w-full flex-col items-start gap-4 border-b border-solid border-neutral-border bg-default-background px-8 py-6 mobile:px-4 mobile:py-4">
				<div className="flex items-center gap-3">
					<IconButton
						size="small"
						icon={<FeatherArrowLeft />}
						onClick={() => {
							void navigate({ to: "/admin" });
						}}
					/>
					<Breadcrumbs>
						<Breadcrumbs.Item>Websites</Breadcrumbs.Item>
						<Breadcrumbs.Divider />
						<Breadcrumbs.Item>
							{detailQuery.data?.website.title ?? "…"}
						</Breadcrumbs.Item>
						{selectedPage ? (
							<>
								<Breadcrumbs.Divider />
								<Breadcrumbs.Item active={true}>
									{selectedPage.path}
								</Breadcrumbs.Item>
							</>
						) : null}
					</Breadcrumbs>
				</div>
				<div className="flex w-full items-center justify-between mobile:flex-col mobile:flex-nowrap mobile:items-start mobile:justify-start mobile:gap-4">
					<div className="flex items-start gap-4">
						<div className="flex flex-col items-start gap-1">
							<div className="flex items-center gap-3">
								<span className="text-heading-1 font-heading-1 text-default-font mobile:text-heading-2 mobile:font-heading-2">
									{detailQuery.data?.website.title ?? "Loading…"}
								</span>
								{detailQuery.data ? (
									<Badge variant="success" icon={<FeatherCheck />}>
										Active
									</Badge>
								) : null}
							</div>
							<span className="text-body font-body text-subtext-color">
								{detailQuery.data?.website.rootDomain ?? ""}
							</span>
						</div>
					</div>
					<Button
						className="mobile:w-full"
						icon={<FeatherRefreshCw />}
						loading={embedMutation.isPending}
						disabled={!detailQuery.data}
						onClick={() => {
							embedMutation.mutate();
						}}
					>
						Re-embed
					</Button>
				</div>
			</div>
			<div className="flex w-full grow shrink-0 basis-0 items-start overflow-hidden mobile:flex-col mobile:flex-nowrap mobile:gap-0">
				<div className="flex w-80 flex-none flex-col items-start self-stretch border-r border-solid border-neutral-border bg-default-background mobile:h-auto mobile:w-full mobile:flex-none mobile:self-auto mobile:border-r-0 mobile:border-b">
					<div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-4 py-4">
						<div className="flex w-full items-center justify-between">
							<span className="text-heading-3 font-heading-3 text-default-font">
								Pages
							</span>
							<span className="text-caption font-caption text-subtext-color">
								{pages.length} pages
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
								placeholder="Filter pages..."
								value={filter}
								onChange={(event) => setFilter(event.target.value)}
							/>
						</TextField>
					</div>
					<div className="flex w-full grow shrink-0 basis-0 flex-col items-start overflow-y-auto mobile:max-h-[256px] mobile:w-full mobile:grow mobile:shrink-0 mobile:basis-0">
						{detailQuery.isLoading ? (
							<div className="w-full px-4 py-6 text-body font-body text-subtext-color">
								Loading pages…
							</div>
						) : filteredPages.length === 0 ? (
							<div className="w-full px-4 py-6 text-body font-body text-subtext-color">
								{pages.length === 0 ? "No pages yet." : "No matching pages."}
							</div>
						) : (
							filteredPages.map((page) => {
								const isSelected = page.id === selectedPageId;
								return (
									<button
										key={page.id}
										type="button"
										onClick={() => setSelectedPageId(page.id)}
										className={
											isSelected
												? "flex w-full items-center gap-3 border-l-2 border-solid border-brand-600 bg-brand-50 px-4 py-3 cursor-pointer text-left"
												: "flex w-full items-center gap-3 border-l-2 border-solid border-transparent px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors text-left"
										}
									>
										<div className="flex grow shrink-0 basis-0 flex-col items-start gap-1 min-w-0">
											<span
												className={
													isSelected
														? "text-monospace-body font-monospace-body text-brand-700 truncate w-full"
														: "text-monospace-body font-monospace-body text-default-font truncate w-full"
												}
											>
												{page.path}
											</span>
											<div className="flex items-center gap-3">
												<span className="text-caption font-caption text-subtext-color">
													{page.chunkCount} chunks
												</span>
												<span className="text-caption font-caption text-neutral-300">
													•
												</span>
												<span className="text-caption font-caption text-subtext-color">
													{formatRelativeTime(page.scrapedAt)}
												</span>
											</div>
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>
				<div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch overflow-hidden">
					<div className="flex w-full items-center justify-between border-b border-solid border-neutral-border bg-default-background px-6 py-4 mobile:flex-col mobile:flex-nowrap mobile:items-start mobile:justify-start mobile:gap-3 mobile:px-4 mobile:py-4">
						<div className="flex items-center gap-3 mobile:flex-row mobile:flex-wrap mobile:gap-3">
							<span className="text-heading-3 font-heading-3 text-default-font">
								Chunks
							</span>
							<span className="line-clamp-1 text-body font-body text-subtext-color">
								{selectedPage?.path ?? "Select a page"}
							</span>
							{selectedPage ? (
								<Badge variant="brand">{chunks.length} chunks</Badge>
							) : null}
						</div>
						{selectedPage ? (
							<Button
								variant="neutral-secondary"
								size="small"
								icon={<FeatherRefreshCw />}
								loading={embedPageMutation.isPending}
								disabled={embedMutation.isPending}
								onClick={() => {
									embedPageMutation.mutate(selectedPage.id);
								}}
							>
								Re-embed page
							</Button>
						) : null}
					</div>
					<div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-24 py-6 overflow-y-auto mobile:px-6 mobile:py-4">
						{!selectedPageId ? (
							<div className="w-full text-body font-body text-subtext-color">
								Select a page to view its chunks.
							</div>
						) : chunksQuery.isLoading ? (
							<div className="w-full text-body font-body text-subtext-color">
								Loading chunks…
							</div>
						) : chunks.length === 0 ? (
							<div className="w-full text-body font-body text-subtext-color">
								No chunks yet for this page. Click “Re-embed” to generate them.
							</div>
						) : (
							chunks.map((chunk) => (
								<div
									key={chunk.id}
									className="flex w-full flex-col items-start gap-3 rounded-lg border border-solid border-neutral-border bg-default-background px-5 py-4 shadow-sm"
								>
									<div className="flex w-full items-center justify-between">
										<div className="flex items-center gap-3">
											<span className="text-caption font-caption text-subtext-color">
												{chunk.tokenCount} tokens
											</span>
											<ChunkStatusBadge status={chunk.status} />
										</div>
										<CopyToClipboardButton
											clipboardText={chunk.content}
											tooltipText="Copy chunk text"
											onCopy={() => {}}
										/>
									</div>
									<div className="flex w-full flex-col items-start rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
										<span className="text-monospace-body font-monospace-body text-default-font whitespace-pre-wrap">
											{chunk.content}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
