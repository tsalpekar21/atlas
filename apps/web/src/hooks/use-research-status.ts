import { useEffect, useState } from "react";
import { env } from "@/env";

export type ResearchStatus =
	| "idle"
	| "planning"
	| "researching"
	| "synthesizing"
	| "persisting"
	| "complete"
	| "skipped"
	| "failed";

export type ResearchStatusEvent = {
	status: Exclude<ResearchStatus, "idle">;
	roundId?: string;
	reason?: string;
	at: string;
};

const ACTIVE_STATUSES: ReadonlySet<ResearchStatus> = new Set([
	"planning",
	"researching",
	"synthesizing",
	"persisting",
]);

/**
 * Subscribes to the API SSE bridge at `/research/:threadId/stream` and
 * exposes the current research round status. `active` is true while a
 * round is planning/researching/synthesizing — the chat UI uses this to
 * render a small "Researching…" indicator.
 *
 * Status resets back to `idle` on a fresh connection, so reloading the
 * page between rounds won't leave the indicator stuck.
 */
export function useResearchStatus(threadId: string | null): {
	status: ResearchStatus;
	active: boolean;
	lastEvent: ResearchStatusEvent | null;
} {
	const [status, setStatus] = useState<ResearchStatus>("idle");
	const [lastEvent, setLastEvent] = useState<ResearchStatusEvent | null>(null);

	useEffect(() => {
		if (!threadId) return;
		const base = env.VITE_API_URL.replace(/\/$/, "");
		const url = `${base}/research/${encodeURIComponent(threadId)}/stream`;
		const source = new EventSource(url, { withCredentials: true });

		const onStatus = (e: MessageEvent) => {
			try {
				const payload = JSON.parse(e.data) as ResearchStatusEvent;
				setStatus(payload.status);
				setLastEvent(payload);
			} catch {
				// ignore malformed frames
			}
		};

		source.addEventListener("status", onStatus as EventListener);
		source.addEventListener("connected", () => setStatus("idle"));
		source.addEventListener("error", () => {
			// EventSource auto-reconnects; we don't surface an error state.
		});

		return () => {
			source.removeEventListener("status", onStatus as EventListener);
			source.close();
		};
	}, [threadId]);

	return {
		status,
		active: ACTIVE_STATUSES.has(status),
		lastEvent,
	};
}
