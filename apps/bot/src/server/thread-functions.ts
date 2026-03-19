import { getThreadMessagesResponseSchema } from "@atlas/schemas/api";
import { createServerFn } from "@tanstack/react-start";
import { api } from "@/lib/mastra-client";

const RESOURCE_ID = "default-patient";

export const listThreads = createServerFn({ method: "GET" }).handler(
	async () => {
		const res = await api.threads.$get({
			query: { resourceId: RESOURCE_ID },
		});
		return res.json();
	},
);

export const getThreadMessages = createServerFn({ method: "GET" })
	.inputValidator((data: { threadId: string }) => data)
	// @ts-expect-error TriageMessage uses `unknown` metadata; Start's Register expects `{}`.
	.handler(async ({ data }) => {
		const res = await api.threads[":threadId"].messages.$get({
			param: { threadId: data.threadId },
			query: { resourceId: RESOURCE_ID },
		});
		const json: unknown = await res.json();
		const parsed = getThreadMessagesResponseSchema.safeParse(json);
		if (!parsed.success) {
			throw new Error("Invalid thread messages response from API");
		}
		return parsed.data.messages;
	});

export const deleteThread = createServerFn({ method: "POST" })
	.inputValidator((data: { threadId: string }) => data)
	.handler(async ({ data }) => {
		const res = await api.threads[":threadId"].$delete({
			param: { threadId: data.threadId },
		});
		return res.json();
	});
