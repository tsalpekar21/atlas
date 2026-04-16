import type { ReactNode } from "react";
import { AuthHero } from "./AuthHero";
import { SiteNavbar } from "./SiteNavbar";

interface AuthShellProps {
	children: ReactNode;
	heroHeadline?: string;
	heroSubhead?: string;
}

export function AuthShell({
	children,
	heroHeadline,
	heroSubhead,
}: AuthShellProps) {
	return (
		<div className="relative flex min-h-svh w-full flex-col bg-default-background">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-neutral-900 mobile:hidden"
			/>
			<div className="relative z-10 flex flex-1 flex-col">
				<SiteNavbar variant="auth" />
				<div className="flex w-full flex-1 items-stretch">
					<AuthHero headline={heroHeadline} subhead={heroSubhead} />
					<div className="flex w-1/2 flex-col items-center justify-center overflow-y-auto px-12 py-12 mobile:h-auto mobile:w-full mobile:grow mobile:shrink-0 mobile:basis-0 mobile:px-6 mobile:py-8">
						<div className="flex w-full max-w-[384px] flex-col items-start gap-6">
							{children}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
