import { env } from "@/env";

// Admin-only API client. Kept in `lib/admin/` so user-facing code does not
// import it. Uses plain fetch against `/admin/*` rather than hc<AppType>
// because the admin sub-app is intentionally excluded from the exported
// AppType (see apps/api/src/app.ts) to prevent admin route shapes from
// leaking into the public RPC client.
const base = env.VITE_API_URL.replace(/\/$/, "");

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${base}/admin${path}`, {
		...init,
		credentials: "include",
	});
	if (!res.ok) {
		throw new Error(`Admin request failed: ${res.status}`);
	}
	return res.json() as Promise<T>;
}

export type AdminUser = {
	id: string;
	email: string;
	name: string;
	role: string | null;
	banned: boolean | null;
	createdAt: string;
};

export function listAdminUsers(): Promise<{ users: AdminUser[] }> {
	return adminFetch("/users");
}
