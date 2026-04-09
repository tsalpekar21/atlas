import type { GetThreadMessagesResponse } from "@atlas/schemas/api";
import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { z } from "zod";
import { ChatPage } from "@/components/chat/ChatPage";
import { ChatThreadPending } from "@/components/chat/ChatThreadPending";
import { ensureSessionForTriage } from "@/lib/ensure-session-for-triage";
import { createTriageApiClient } from "@/lib/triage-api-client";

type ThreadLoaderData = {
	threadMessages: UIMessage[];
	threadMessagesError: string | null;
};

const chatSearchSchema = z.object({
	initialMessage: z.string().optional(),
});

export const Route = createFileRoute("/chat/$threadId")({
	validateSearch: chatSearchSchema,
	/** Cookie/session + thread fetch need the browser; skip SSR for this route. */
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Atlas Health — Your health companion" },
			{
				name: "description",
				content:
					"Evidence-informed assistant for symptoms, treatment research, and health goals.",
			},
		],
	}),
	beforeLoad: async () => {
		const result = await ensureSessionForTriage();
		return {
			context: {
				triageSessionError: result.ok ? null : result.message,
			},
		};
	},
	loader: async ({ params, context: routeContext }) => {
		if (routeContext.context.triageSessionError) {
			return {
				threadMessages: [],
				threadMessagesError: null,
			} satisfies ThreadLoaderData;
		}
		try {
			const client = createTriageApiClient();
			const res = await client.threads[":threadId"].messages.$get({
				param: { threadId: params.threadId },
			});
			if (!res.ok) {
				throw new Error(`Failed to load thread messages (${res.status})`);
			}
			const data = (await res.json()) as GetThreadMessagesResponse;
			const { messages: threadMessages } = data;
			return {
				threadMessages,
				threadMessagesError: null,
			} satisfies ThreadLoaderData;
		} catch (e) {
			return {
				threadMessages: [],
				threadMessagesError:
					e instanceof Error ? e.message : "Could not load this conversation.",
			} satisfies ThreadLoaderData;
		}
	},
	pendingComponent: ChatThreadPending,
	component: ChatThreadRoute,
});

function ChatThreadRoute() {
	const { threadId } = Route.useParams();
	const { initialMessage } = Route.useSearch();
	const loaderData = Route.useLoaderData();
	const routeContext = Route.useRouteContext();

	return (
		<ChatPage
			key={threadId}
			threadId={threadId}
			initialMessage={initialMessage}
			sessionError={routeContext.context.triageSessionError}
			threadMessages={loaderData.threadMessages}
			threadMessagesError={loaderData.threadMessagesError}
		/>
	);
}
