import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/ui/AuthShell";

export const Route = createFileRoute("/forgot-password")({
	ssr: false,
	head: () => ({
		meta: [{ title: "Forgot password — Atlas Health" }],
	}),
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	return (
		<AuthShell>
			<div className="flex w-full flex-col items-start gap-2">
				<span className="text-heading-1 font-heading-1 text-default-font">
					Coming soon
				</span>
				<span className="text-body font-body text-subtext-color">
					Password reset isn&rsquo;t available yet. Please contact support if
					you&rsquo;ve been locked out.
				</span>
			</div>
		</AuthShell>
	);
}
