import { createFileRoute, redirect } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";
import { authClient } from "@/lib/auth-client";

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
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data?.user.role === "admin") {
			throw redirect({ to: "/admin" });
		}
	},
	component: Home,
});

function Home() {
	return <LandingPage />;
}
