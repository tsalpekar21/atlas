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

// --- Admin API response schemas ---

export const adminUserSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	role: z.string().nullable(),
	banned: z.boolean().nullable(),
	createdAt: z.string(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const listAdminUsersResponseSchema = z.object({
	users: z.array(adminUserSchema),
});

export type ListAdminUsersResponse = z.infer<
	typeof listAdminUsersResponseSchema
>;

export const adminWebsiteSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	rootDomain: z.string(),
	pageCount: z.number().int().nonnegative(),
	createdAt: z.string(),
});

export type AdminWebsite = z.infer<typeof adminWebsiteSchema>;

export const listAdminWebsitesResponseSchema = z.object({
	websites: z.array(adminWebsiteSchema),
});

export type ListAdminWebsitesResponse = z.infer<
	typeof listAdminWebsitesResponseSchema
>;

// Admin website detail (pages + chunks)

export const adminPageSummarySchema = z.object({
	id: z.string().uuid(),
	path: z.string(),
	title: z.string().nullable(),
	chunkCount: z.number().int().nonnegative(),
	scrapedAt: z.string(),
});

export type AdminPageSummary = z.infer<typeof adminPageSummarySchema>;

export const adminWebsiteDetailSchema = z.object({
	website: z.object({
		id: z.string().uuid(),
		title: z.string(),
		rootDomain: z.string(),
		createdAt: z.string(),
	}),
	pages: z.array(adminPageSummarySchema),
});

export type AdminWebsiteDetail = z.infer<typeof adminWebsiteDetailSchema>;

export const adminWebsiteDetailResponseSchema = adminWebsiteDetailSchema;

export const adminChunkStatusSchema = z.enum(["pending", "embedded", "failed"]);

export type AdminChunkStatus = z.infer<typeof adminChunkStatusSchema>;

export const adminChunkSchema = z.object({
	id: z.string().uuid(),
	chunkIndex: z.number().int().nonnegative(),
	content: z.string(),
	tokenCount: z.number().int().nonnegative(),
	status: adminChunkStatusSchema,
});

export type AdminChunk = z.infer<typeof adminChunkSchema>;

export const listPageChunksResponseSchema = z.object({
	chunks: z.array(adminChunkSchema),
});

export type ListPageChunksResponse = z.infer<
	typeof listPageChunksResponseSchema
>;

export const embedWebsiteResponseSchema = z.object({
	started: z.literal(true),
});

export type EmbedWebsiteResponse = z.infer<typeof embedWebsiteResponseSchema>;

// --- Chat request schema ---

export const chatRequestSchema = z.object({
	threadId: z.string(),
	messages: z.array(z.record(z.string(), z.unknown())),
	id: z.string().optional(),
	trigger: z.string().optional(),
	messageId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
