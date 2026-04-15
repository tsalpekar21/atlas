import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export type Session = NonNullable<
	Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

export const sessionQueryOptions = queryOptions({
	queryKey: SESSION_QUERY_KEY,
	queryFn: async (): Promise<Session | null> => {
		const result = await authClient.getSession();
		if (result.error) {
			throw new Error(result.error.message ?? "Failed to load session");
		}
		return result.data ?? null;
	},
	staleTime: 60 * 1000,
	gcTime: 5 * 60 * 1000,
});
