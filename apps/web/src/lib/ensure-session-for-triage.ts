import type { QueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { SESSION_QUERY_KEY, sessionQueryOptions } from "@/lib/session-query";

/**
 * Ensures the browser has a Better Auth session before hitting triage (API requires cookies).
 * Creates an anonymous session only when there is no user yet.
 */
export async function ensureSessionForTriage(
	queryClient: QueryClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
	try {
		const session = await queryClient.ensureQueryData(sessionQueryOptions);
		if (session?.user) {
			return { ok: true };
		}
	} catch (error) {
		return {
			ok: false,
			message:
				error instanceof Error ? error.message : "Could not load session",
		};
	}

	const signedIn = await authClient.signIn.anonymous();
	if (signedIn.error) {
		return {
			ok: false,
			message: signedIn.error.message ?? "Could not start session",
		};
	}

	await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
	return { ok: true };
}
