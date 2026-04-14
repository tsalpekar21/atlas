import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import { FadeIn } from "@/components/motion";
import { AuthShell } from "@/components/ui/AuthShell";

export const Route = createFileRoute("/sign-in")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Sign in — Atlas Health" },
			{
				name: "description",
				content: "Sign in to your Atlas Health account.",
			},
		],
	}),
	component: SignInPage,
});

function SignInPage() {
	const navigate = useNavigate();
	const handleSuccess = useCallback(() => {
		void navigate({ to: "/" });
	}, [navigate]);

	return (
		<AuthShell>
			<FadeIn className="flex w-full flex-col items-start gap-6">
				<SignInForm onSuccess={handleSuccess} />
			</FadeIn>
		</AuthShell>
	);
}
