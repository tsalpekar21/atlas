import type { Mastra } from "@mastra/core/mastra";
import { TRIAGE_AGENT_ID } from "./constants.ts";

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
