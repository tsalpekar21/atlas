import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { sessionQueryOptions } from "@/lib/session-query";

export const Route = createFileRoute("/")({
	// Session lookup depends on browser cookies, so beforeLoad must run client-side.
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Atlas Health — Every patient deserves a care team" },
			{
				name: "description",
				content:
					"AI-guided triage, real doctors when you need them. Describe how you feel and we will guide you.",
			},
		],
	}),
	loader: ({ context }) => {
		// Warm the cache without blocking — the landing page renders immediately
		// and the admin-redirect check runs in the component once the query
		// resolves. This is a UX convenience, not a security boundary (the admin
		// route has its own loader guard).
		void context.queryClient.prefetchQuery(sessionQueryOptions);
	},
	component: Home,
});

function Home() {
	const navigate = useNavigate();
	const { data: session } = useQuery(sessionQueryOptions);

	useEffect(() => {
		if (session?.user.role === "admin") {
			void navigate({ to: "/admin" });
		}
	}, [session, navigate]);

	return <LandingPage />;
}
