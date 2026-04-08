import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
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
	component: Home,
});

function Home() {
	return <LandingPage />;
}
