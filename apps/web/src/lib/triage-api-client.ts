import type { AppType } from "@atlas/api/app";
import { hc } from "hono/client";
import { env } from "@/env";

/**
 * Typed Hono RPC client for the API app (`apps/api` → `AppType`).
 *
 * **Request:** `zValidator` on routes (e.g. query on `GET /threads/:threadId/messages`).
 * **Response body:** validated on the API with `getThreadMessagesResponseSchema.parse`
 * before `c.json` — callers can trust JSON shape without re-parsing on the client.
 */
export function createTriageApiClient() {
	const base = env.VITE_API_URL.replace(/\/$/, "");
	return hc<AppType>(base, {
		fetch: (input: RequestInfo | URL, init: RequestInit | undefined) =>
			fetch(input, { ...init, credentials: "include" }),
	});
}
