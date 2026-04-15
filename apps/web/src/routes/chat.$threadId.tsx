import type { GetThreadMessagesResponse } from "@atlas/schemas/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { z } from "zod";
import { ChatPage } from "@/components/chat/ChatPage";
import { ChatThreadPending } from "@/components/chat/ChatThreadPending";
import { ensureSessionForTriage } from "@/lib/ensure-session-for-triage";
import { createTriageApiClient } from "@/lib/triage-api-client";

const chatSearchSchema = z.object({
	initialMessage: z.string().optional(),
});

async function fetchThreadMessages(threadId: string): Promise<UIMessage[]> {
	const client = createTriageApiClient();
	const res = await client.threads[":threadId"].messages.$get({
		param: { threadId },
	});
	if (!res.ok) {
		throw new Error(`Failed to load thread messages (${res.status})`);
	}
	const data = (await res.json()) as GetThreadMessagesResponse;
	return data.messages;
}

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
	loader: async ({ context }) => {
		const result = await ensureSessionForTriage(context.queryClient);
		return {
			triageSessionError: result.ok ? null : result.message,
		};
	},
	pendingComponent: ChatThreadPending,
	pendingMs: 0,
	component: ChatThreadRoute,
});

function ChatThreadRoute() {
	const { threadId } = Route.useParams();
	const { initialMessage } = Route.useSearch();
	const { triageSessionError: sessionError } = Route.useLoaderData();

	const {
		data: threadMessages,
		error: threadMessagesQueryError,
		isLoading: threadMessagesLoading,
	} = useQuery({
		queryKey: ["thread-messages", threadId],
		queryFn: () => fetchThreadMessages(threadId),
		enabled: !sessionError,
	});

	if (!sessionError && threadMessagesLoading) {
		return <ChatThreadPending />;
	}

	const threadMessagesError = threadMessagesQueryError
		? threadMessagesQueryError instanceof Error
			? threadMessagesQueryError.message
			: "Could not load this conversation."
		: null;

	return (
		<ChatPage
			key={threadId}
			threadId={threadId}
			initialMessage={initialMessage}
			sessionError={sessionError}
			threadMessages={threadMessages ?? []}
			threadMessagesError={threadMessagesError}
		/>
	);
}
