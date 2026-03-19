import { handleChatStream } from "@mastra/ai-sdk";
import type { Mastra } from "@mastra/core/mastra";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";

/**
 * Streams triage agent chat in AI SDK UI message format.
 * Mastra bundles AI SDK v5 typings that diverge slightly from the workspace `ai`
 * package; streams are compatible at runtime.
 */
export async function buildChatUiResponse(
	mastra: Mastra,
	body: unknown,
): Promise<Response> {
	const stream = await handleChatStream({
		mastra,
		agentId: "triageAgent",
		params: body,
	} as Parameters<typeof handleChatStream>[0]);
	return createUIMessageStreamResponse({
		stream: stream as ReadableStream<UIMessageChunk>,
	});
}
