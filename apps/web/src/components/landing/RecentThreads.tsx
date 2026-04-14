import type { ListThreadsResponse, ThreadSummary } from "@atlas/schemas/api";
import { FeatherMessageCircle } from "@subframe/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { createTriageApiClient } from "@/lib/triage-api-client";

const MAX_THREADS = 5;

async function fetchThreads(): Promise<ListThreadsResponse> {
	const client = createTriageApiClient();
	const res = await client.threads.$get();
	if (!res.ok) {
		throw new Error(`Failed to load threads (${res.status})`);
	}
	return await res.json();
}

function sortByUpdatedDesc(a: ThreadSummary, b: ThreadSummary): number {
	return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export function RecentThreads() {
	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;

	const { data } = useQuery({
		queryKey: ["threads", userId],
		queryFn: fetchThreads,
		enabled: Boolean(userId),
		staleTime: 30_000,
	});

	if (!userId || !data) return null;

	const recent = [...data.threads]
		.sort(sortByUpdatedDesc)
		.slice(0, MAX_THREADS);
	if (recent.length === 0) return null;

	return (
		<div className="flex w-full flex-col items-start gap-3">
			<span className="text-caption-bold font-caption-bold text-subtext-color">
				Or pick up where you left off
			</span>
			<div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-200 bg-default-background">
				{recent.map((thread, index) => (
					<div key={thread.id} className="flex w-full flex-col">
						{index > 0 ? (
							<div className="flex h-px w-full flex-none items-start bg-neutral-200" />
						) : null}
						<Link
							to="/chat/$threadId"
							params={{ threadId: thread.id }}
							className="flex w-full items-center justify-between px-4 py-3 no-underline hover:bg-neutral-50"
						>
							<div className="flex min-w-0 items-center gap-3">
								<FeatherMessageCircle className="text-body font-body text-neutral-400" />
								<span className="truncate text-body font-body text-default-font">
									{thread.title ?? "New conversation"}
								</span>
							</div>
							<span className="flex-none text-caption font-caption text-neutral-400">
								{formatRelativeTime(thread.updatedAt)}
							</span>
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}
