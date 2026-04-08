import type { ListThreadsResponse } from "@atlas/schemas/api";
import type { Mastra } from "@mastra/core/mastra";
import { TRIAGE_AGENT_ID } from "./constants.ts";

export async function listThreadsForResource(
	mastra: Mastra,
	resourceId: string,
): Promise<ListThreadsResponse> {
	const agent = mastra.getAgent(TRIAGE_AGENT_ID);
	const memory = await agent.getMemory();
	if (!memory) {
		return { threads: [], total: 0, hasMore: false };
	}
	const result = await memory.listThreads({
		filter: { resourceId },
		orderBy: { field: "createdAt", direction: "DESC" },
		perPage: 50,
	});
	return {
		threads: result.threads.map((t) => ({
			id: t.id,
			title: t.title,
			resourceId: t.resourceId,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt.toISOString(),
		})),
		total: result.total,
		hasMore: result.hasMore,
	};
}
