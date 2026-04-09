import { EventEmitter } from "node:events";

/**
 * Tiny in-process pub/sub used to stream `backgroundResearchWorkflow` step
 * status from the workflow runner to the SSE route that the web app
 * subscribes to.
 *
 * This works because the Inngest function and the Hono SSE handler live in
 * the same Node process — Inngest devserver (and the managed Inngest Cloud
 * executor) both call back into our `/api/inngest` handler to execute
 * function steps, and that handler runs here. For multi-instance deploys
 * this needs to be swapped for Redis pub/sub or Postgres LISTEN/NOTIFY.
 */
export type ResearchStatus =
	| "planning"
	| "researching"
	| "synthesizing"
	| "persisting"
	| "complete"
	| "skipped"
	| "failed";

export type ResearchStatusEvent = {
	status: ResearchStatus;
	roundId?: string;
	reason?: string;
	at: string; // ISO timestamp
};

const emitter = new EventEmitter();
// Each thread can have multiple SSE subscribers; lift the default limit.
emitter.setMaxListeners(100);

function channelName(threadId: string): string {
	return `thread:${threadId}:research`;
}

export function publishResearchStatus(
	threadId: string,
	event: Omit<ResearchStatusEvent, "at">,
): void {
	const payload: ResearchStatusEvent = {
		...event,
		at: new Date().toISOString(),
	};
	emitter.emit(channelName(threadId), payload);
}

export function subscribeResearchStatus(
	threadId: string,
	handler: (event: ResearchStatusEvent) => void,
): () => void {
	const name = channelName(threadId);
	emitter.on(name, handler);
	return () => emitter.off(name, handler);
}
