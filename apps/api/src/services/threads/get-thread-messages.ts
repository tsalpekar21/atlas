import type { GetThreadMessagesResponse } from "@atlas/schemas/api";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { Mastra } from "@mastra/core/mastra";
import { TRIAGE_AGENT_ID } from "./constants.ts";

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
