import type { UIMessage } from "ai";
import { z } from "zod";

/** JSON body for API error responses (4xx/5xx). */
export const apiErrorBodySchema = z.object({
	error: z.string().optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

// --- Thread API response schemas ---

export const threadSummarySchema = z.object({
	id: z.string(),
	title: z
		.string()
		.nullable()
		.transform((v) => v ?? undefined)
		.optional(),
	resourceId: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type ThreadSummary = z.infer<typeof threadSummarySchema>;

export const listThreadsResponseSchema = z.object({
	threads: z.array(threadSummarySchema),
	total: z.number(),
	hasMore: z.boolean(),
});

export type ListThreadsResponse = z.infer<typeof listThreadsResponseSchema>;

// Messages are AI SDK UIMessage objects with a complex union type.
// We validate the wrapper and treat individual messages as opaque objects.
export const getThreadMessagesResponseSchema = z.object({
	messages: z.array(z.custom<UIMessage>()),
});

export type GetThreadMessagesResponse = z.infer<
	typeof getThreadMessagesResponseSchema
>;

export const deleteThreadResponseSchema = z.object({
	success: z.boolean(),
});

export type DeleteThreadResponse = z.infer<typeof deleteThreadResponseSchema>;
