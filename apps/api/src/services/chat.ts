import { logger } from "@atlas/logger";
import { handleChatStream } from "@mastra/ai-sdk";
import type { Mastra } from "@mastra/core/mastra";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { snapshotMessageDebug } from "./debug.ts";
import { enqueueResearchEvaluation } from "./research.ts";

/**
 * Streams triage agent chat in AI SDK UI message format.
 * Mastra bundles AI SDK v5 typings that diverge slightly from the workspace `ai`
 * package; streams are compatible at runtime.
 *
 * After the stream finishes we fire an Inngest event to trigger a background
 * research evaluation for this thread. Inngest applies soft debounce + a
 * singleton-per-thread concurrency limit on the receiving function, so
 * calling this after every turn is safe.
 */
export async function buildChatUiResponse(
	mastra: Mastra,
	body: unknown,
	userId: string,
): Promise<Response> {
	const { threadId, ...rest } = body as Record<string, unknown>;
	const threadIdStr = typeof threadId === "string" ? threadId : undefined;

	const params = {
		...rest,
		memory: {
			thread: threadIdStr,
			resource: userId,
		},
	};

	const stream = await handleChatStream({
		mastra,
		agentId: "healthAssistant",
		version: "v6",
		// AI SDK v5/v6 UI message types diverge from the workspace `ai` package's
		// typings; the params are structurally correct at runtime.
		params: params as never,
	});

	const fireOnDone = new TransformStream<UIMessageChunk, UIMessageChunk>({
		transform(chunk, controller) {
			controller.enqueue(chunk);
		},
		async flush() {
			if (!threadIdStr) return;
			// Snapshot first: we want to record the round the agent was
			// looking at on this turn BEFORE we queue up a new round whose
			// completion might race the snapshot and rewrite "latest."
			// `snapshotMessageDebug` is wrapped in try/catch internally and
			// will never throw.
			await snapshotMessageDebug({
				mastra,
				threadId: threadIdStr,
				userId,
			});
			try {
				await enqueueResearchEvaluation({
					mastra,
					threadId: threadIdStr,
					userId,
				});
			} catch (err) {
				logger.error(
					{ err, threadId: threadIdStr },
					"chat: failed to enqueue research evaluation",
				);
			}
		},
	});

	return createUIMessageStreamResponse({
		stream: (stream as ReadableStream<UIMessageChunk>).pipeThrough(fireOnDone),
	});
}
