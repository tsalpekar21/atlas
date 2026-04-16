import type { Mastra } from "@mastra/core/mastra";
import { HEALTH_ASSISTANT_AGENT_ID } from "../../src/services/threads/constants.ts";

/**
 * Seed working memory for a given thread + resource so integration
 * tests can drive the research workflow against a known chart state.
 * Calls the real Mastra memory API the health assistant uses in
 * production — no shortcut into the underlying PostgresStore.
 *
 * `resourceId` is the user id in Mastra's memory model; defaults to
 * the same value as the thread id for tests that don't care.
 */
export async function seedWorkingMemory(args: {
	mastra: Mastra;
	threadId: string;
	resourceId?: string;
	chart: string;
}): Promise<void> {
	const { mastra, threadId, chart } = args;
	const resourceId = args.resourceId ?? threadId;

	const agent = mastra.getAgent(HEALTH_ASSISTANT_AGENT_ID);
	const memory = await agent.getMemory();
	if (!memory) {
		throw new Error("seedWorkingMemory: agent has no memory configured");
	}

	// Ensure the thread exists first — Mastra's `updateWorkingMemory`
	// errors on missing threads. `createThread` is idempotent via
	// a unique id so re-calling on the same id is a no-op.
	await memory.createThread({
		threadId,
		resourceId,
	});

	await memory.updateWorkingMemory({
		threadId,
		resourceId,
		workingMemory: chart,
	});
}
