import { useCallback, useEffect, useRef, useState } from "react";
import type { DebugSnapshot } from "@/components/chat/debug-format";
import { createTriageApiClient } from "@/lib/triage-api-client";

type UseDebugSnapshotsResult = {
	byMessageId: Map<string, DebugSnapshot>;
	loaded: boolean;
	refetch: () => void;
};

const EMPTY_MAP = new Map<string, DebugSnapshot>();

/**
 * Fetch the dev-only `/debug/:threadId/snapshots` endpoint once per
 * thread and on each assistant-turn completion, keyed by `isBusy`
 * transitioning from true → false. Returns a message-id indexed map
 * that the debug panel components look up per message.
 *
 * Deliberately built without TanStack Query — it's a tiny dev endpoint
 * that runs twice per conversation turn and we don't want to add
 * complexity for something that's not going to ship to end users.
 *
 * In production builds the hook does nothing and returns an empty map.
 */
export function useDebugSnapshots(
	threadId: string | null,
	isBusy: boolean,
): UseDebugSnapshotsResult {
	const [byMessageId, setByMessageId] =
		useState<Map<string, DebugSnapshot>>(EMPTY_MAP);
	const [loaded, setLoaded] = useState(false);
	const prevBusyRef = useRef(isBusy);

	const fetchSnapshots = useCallback(async () => {
		if (import.meta.env.MODE === "production") return;
		if (!threadId) return;
		try {
			const client = createTriageApiClient();
			const res = await client.debug[":threadId"].snapshots.$get({
				param: { threadId },
			});
			if (!res.ok) return;
			const body = await res.json();
			const next = new Map<string, DebugSnapshot>();
			for (const snap of body.snapshots) {
				if (!snap.researchRound) continue;
				next.set(snap.messageId, {
					...snap,
					researchRound: {
						...snap.researchRound,
						workerOutputs: snap.researchRound.workerOutputs ?? null,
					},
				});
			}
			setByMessageId(next);
			setLoaded(true);
		} catch {
			// Silent — debug is best-effort.
		}
	}, [threadId]);

	// Initial fetch on mount / thread change.
	useEffect(() => {
		void fetchSnapshots();
	}, [fetchSnapshots]);

	// Refetch on isBusy transition true → false (assistant finished).
	useEffect(() => {
		const prev = prevBusyRef.current;
		prevBusyRef.current = isBusy;
		if (prev && !isBusy) {
			// Small delay so the flush callback has time to write the
			// snapshot row before we read it back.
			const t = setTimeout(() => {
				void fetchSnapshots();
			}, 350);
			return () => clearTimeout(t);
		}
	}, [isBusy, fetchSnapshots]);

	return { byMessageId, loaded, refetch: fetchSnapshots };
}
