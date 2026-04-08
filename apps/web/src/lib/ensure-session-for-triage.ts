import { authClient } from "@/lib/auth-client";

/**
 * Ensures the browser has a Better Auth session before hitting triage (API requires cookies).
 * Creates an anonymous session only when there is no user yet.
 */
export async function ensureSessionForTriage(): Promise<
	{ ok: true } | { ok: false; message: string }
> {
	const session = await authClient.getSession();
	if (session.error) {
		return {
			ok: false,
			message: session.error.message ?? "Could not load session",
		};
	}
	if (session.data?.user) {
		return { ok: true };
	}

	const signedIn = await authClient.signIn.anonymous();
	if (signedIn.error) {
		return {
			ok: false,
			message: signedIn.error.message ?? "Could not start session",
		};
	}

	return { ok: true };
}
