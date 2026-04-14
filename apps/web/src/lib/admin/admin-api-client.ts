import type { AdminAppType } from "@atlas/api/app";
import type {
	ListAdminUsersResponse,
	ListAdminWebsitesResponse,
} from "@atlas/schemas/api";
import { hc } from "hono/client";
import { env } from "@/env";

/**
 * Typed Hono RPC client for the admin sub-app (`apps/api` → `AdminAppType`).
 *
 * Kept in `lib/admin/` so user-facing code does not import it. Uses its own
 * `AdminAppType` export (separate from `AppType`) so admin route shapes stay
 * out of the public `hc<AppType>` client's autocomplete surface while still
 * giving us full typed RPC on the admin side.
 */
export function createAdminApiClient() {
	const base = env.VITE_API_URL.replace(/\/$/, "");
	return hc<AdminAppType>(`${base}/admin`, {
		fetch: (input: RequestInfo | URL, init: RequestInit | undefined) =>
			fetch(input, { ...init, credentials: "include" }),
	});
}

export async function listAdminUsers(): Promise<ListAdminUsersResponse> {
	const client = createAdminApiClient();
	const res = await client.users.$get();
	if (!res.ok) {
		throw new Error(`Admin request failed: ${res.status}`);
	}
	return (await res.json()) as ListAdminUsersResponse;
}

export async function listAdminWebsites(): Promise<ListAdminWebsitesResponse> {
	const client = createAdminApiClient();
	const res = await client.websites.$get();
	if (!res.ok) {
		throw new Error(`Admin request failed: ${res.status}`);
	}
	return await res.json();
}
