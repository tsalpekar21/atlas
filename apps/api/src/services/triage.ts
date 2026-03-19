import type {
	GetThreadMessagesResponse,
	ListThreadsResponse,
} from "@atlas/schemas/api";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { Mastra } from "@mastra/core/mastra";

const TRIAGE_AGENT_ID = "triageAgent" as const;

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

export async function getThreadMessagesForResource(
	mastra: Mastra,
	threadId: string,
	resourceId: string,
): Promise<GetThreadMessagesResponse> {
	const agent = mastra.getAgent(TRIAGE_AGENT_ID);
	const memory = await agent.getMemory();
	if (!memory) {
		return { messages: [] };
	}
	const thread = await memory.getThreadById({ threadId });
	if (!thread) {
		return { messages: [] };
	}
	const result = await memory.recall({
		threadId,
		resourceId,
		perPage: false,
	});
	const messages = toAISdkV5Messages(result.messages);
	return {
		messages: messages as GetThreadMessagesResponse["messages"],
	};
}

export async function deleteThreadById(
	mastra: Mastra,
	threadId: string,
): Promise<{ success: true } | { success: false }> {
	const agent = mastra.getAgent(TRIAGE_AGENT_ID);
	const memory = await agent.getMemory();
	if (!memory) {
		return { success: false };
	}
	await memory.deleteThread(threadId);
	return { success: true };
}
