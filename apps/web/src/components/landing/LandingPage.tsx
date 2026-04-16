"use client";

import { Button } from "@atlas/subframe/components/Button";
import {
	FeatherClipboardList,
	FeatherClock,
	FeatherMonitor,
	FeatherRefreshCw,
	FeatherSmartphone,
	FeatherUser,
} from "@subframe/core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { RecentThreads } from "@/components/landing/RecentThreads";
import { FadeStack, PressScale } from "@/components/motion";
import { PromptInput } from "@/components/prompt/PromptInput";
import { SiteNavbar } from "@/components/ui/SiteNavbar";
import { ensureSessionForTriage } from "@/lib/ensure-session-for-triage";
import { buildPatientTriageHref } from "@/lib/patient-triage-url";

const EXAMPLE_PROMPTS: Array<string> = [
	"I have a persistent headache",
	"Should I see a specialist?",
	"I need help understanding what my symptoms could mean",
];

function newThreadId(): string {
	return crypto.randomUUID();
}

export function LandingPage() {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState("");
	const [isStartingTriage, setIsStartingTriage] = useState(false);
	const [triageStartError, setTriageStartError] = useState<string | null>(null);
	const [examplePrompts, setExamplePrompts] = useState(() => [
		...EXAMPLE_PROMPTS,
	]);

	const goToTriage = useCallback(
		async (initialMessage?: string) => {
			if (isStartingTriage) {
				return;
			}
			setIsStartingTriage(true);
			setTriageStartError(null);
			const session = await ensureSessionForTriage(queryClient);
			if (!session.ok) {
				setTriageStartError(session.message);
				setIsStartingTriage(false);
				return;
			}
			const threadId = newThreadId();
			const href = buildPatientTriageHref({ threadId, initialMessage });
			window.location.assign(href);
		},
		[isStartingTriage, queryClient],
	);

	const shuffleExamples = useCallback(() => {
		setExamplePrompts((prev) => {
			const next = [...prev];
			for (let i = next.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const tmp = next[i];
				next[i] = next[j];
				next[j] = tmp;
			}
			return next;
		});
	}, []);

	const onSubmit = useCallback(() => {
		const t = draft.trim();
		if (!t) return;
		void goToTriage(t);
	}, [draft, goToTriage]);

	return (
		<div className="flex h-full min-h-svh w-full flex-col items-center bg-neutral-50">
			<SiteNavbar />
			<FadeStack className="flex w-full max-w-[576px] grow shrink-0 basis-0 flex-col items-center justify-center gap-8 px-6 py-12">
				<FadeStack.Item className="flex flex-col items-center gap-4">
					<span className="text-center font-heading-1 text-[48px] font-semibold leading-[52px] text-default-font -tracking-[0.04em] mobile:text-[36px] mobile:font-normal mobile:leading-[40px] mobile:tracking-normal">
						Every patient deserves a care team
					</span>
					<span className="text-center text-body font-body text-subtext-color">
						AI-guided triage, real doctors when you need them
					</span>
				</FadeStack.Item>

				<FadeStack.Item className="flex w-full flex-col">
					<PromptInput
						value={draft}
						onChange={setDraft}
						onSubmit={onSubmit}
						placeholder="Describe how you are feeling and we will guide you..."
						ariaLabel="Describe how you are feeling"
						disabled={isStartingTriage}
						isLoading={isStartingTriage}
						minHeight={128}
						maxHeight={200}
					/>
					{triageStartError ? (
						<p className="mt-2 text-caption font-caption text-error-600">
							{triageStartError}
						</p>
					) : null}
				</FadeStack.Item>

				<FadeStack.Item className="flex w-full flex-wrap items-start justify-center gap-8 mobile:flex-row mobile:flex-wrap mobile:gap-6">
					{[
						{ icon: <FeatherClock />, label: "Symptoms" },
						{ icon: <FeatherClipboardList />, label: "Records" },
						{ icon: <FeatherUser />, label: "Doctors" },
						{ icon: <FeatherMonitor />, label: "Resources" },
						{ icon: <FeatherSmartphone />, label: "Devices" },
					].map(({ icon, label }) => (
						<FadeStack.Item
							key={label}
							className="flex flex-col items-center gap-2"
						>
							<div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-solid border-neutral-200 bg-default-background">
								<span className="text-heading-3 font-heading-3 text-default-font">
									{icon}
								</span>
							</div>
							<span className="text-caption font-caption text-subtext-color">
								{label}
							</span>
						</FadeStack.Item>
					))}
				</FadeStack.Item>

				<FadeStack.Item className="flex flex-col items-center gap-4">
					<PressScale tapScale={0.97}>
						<button
							type="button"
							className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-caption font-caption text-subtext-color"
							onClick={shuffleExamples}
						>
							<span>Try an example</span>
							<FeatherRefreshCw className="text-caption font-caption" />
						</button>
					</PressScale>
					<div className="flex flex-wrap items-center justify-center gap-3 mobile:h-auto mobile:w-full mobile:flex-none mobile:flex-col mobile:flex-nowrap mobile:gap-3">
						{examplePrompts.map((text) => (
							<PressScale key={text} layout tapScale={0.98} hoverLift={2}>
								<Button
									variant="neutral-secondary"
									disabled={isStartingTriage}
									onClick={() => void goToTriage(text)}
								>
									{text}
								</Button>
							</PressScale>
						))}
					</div>
					<FadeStack.Item className="w-full">
						<RecentThreads />
					</FadeStack.Item>
				</FadeStack.Item>
			</FadeStack>
		</div>
	);
}
