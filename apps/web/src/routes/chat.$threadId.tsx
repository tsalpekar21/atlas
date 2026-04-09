import type { GetThreadMessagesResponse } from "@atlas/schemas/api";
import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { z } from "zod";
import { ChatHeader, ChatPage } from "@/components/chat/ChatPage";
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
			{ title: "Atlas Health — Clinical reasoning chat" },
			{
				name: "description",
				content:
					"Hypothesis-driven clinical reasoning interviewer. One targeted question at a time.",
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

function ChatThreadPending() {
	return (
		<div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-default-background">
			<ChatHeader />
			<div className="flex flex-1 items-center justify-center px-6 py-4 mobile:px-4">
				<p className="text-caption font-caption text-subtext-color">
					Loading conversation…
				</p>
			</div>
		</div>
	);
}

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
