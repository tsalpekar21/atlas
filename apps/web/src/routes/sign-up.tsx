import type { SignUpDetails } from "@atlas/schemas/auth";
import { Stepper } from "@atlas/subframe/components/Stepper";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { SignUpStepCredentials } from "@/components/auth/SignUpStepCredentials";
import { SignUpStepDetails } from "@/components/auth/SignUpStepDetails";
import { FadeIn, SlideSwap } from "@/components/motion";
import { AuthShell } from "@/components/ui/AuthShell";

export const Route = createFileRoute("/sign-up")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Sign up — Atlas Health" },
			{
				name: "description",
				content: "Create your Atlas Health account.",
			},
		],
	}),
	component: SignUpPage,
});

const EMPTY_DETAILS: SignUpDetails = {
	firstName: "",
	lastName: "",
	dateOfBirth: "",
	phoneNumber: "",
};

function SignUpPage() {
	const navigate = useNavigate();
	const client = useQueryClient();
	const [step, setStep] = useState<1 | 2>(1);
	const [direction, setDirection] = useState<1 | -1>(1);
	const [details, setDetails] = useState<SignUpDetails>(EMPTY_DETAILS);

	const handleContinue = useCallback((values: SignUpDetails) => {
		setDetails(values);
		setDirection(1);
		setStep(2);
	}, []);

	const handleBack = useCallback(() => {
		setDirection(-1);
		setStep(1);
	}, []);

	const handleSuccess = useCallback(() => {
		client.invalidateQueries({ queryKey: ["threads"] });
		client.invalidateQueries({ queryKey: ["thread-messages"] });
		void navigate({ to: "/" });
	}, [navigate, client]);

	return (
		<AuthShell>
			<FadeIn className="flex w-full flex-col items-start gap-6">
				<Stepper>
					<Stepper.Step
						variant={step === 1 ? "active" : "completed"}
						firstStep={true}
						stepNumber="1"
						label="Your details"
					/>
					<Stepper.Step
						variant={step === 2 ? "active" : "default"}
						lastStep={true}
						stepNumber="2"
						label="Create account"
					/>
				</Stepper>
				<div className="relative flex w-full flex-col items-start">
					<SlideSwap
						activeKey={step}
						direction={direction}
						className="flex w-full flex-col items-start gap-6"
					>
						{step === 1 ? (
							<SignUpStepDetails
								defaultValues={details}
								onContinue={handleContinue}
							/>
						) : (
							<SignUpStepCredentials
								details={details}
								onBack={handleBack}
								onSuccess={handleSuccess}
							/>
						)}
					</SlideSwap>
				</div>
			</FadeIn>
		</AuthShell>
	);
}
