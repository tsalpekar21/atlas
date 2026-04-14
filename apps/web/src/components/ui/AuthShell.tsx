import type { ReactNode } from "react";
import { AuthHero } from "./AuthHero";
import { BrandMark } from "./BrandMark";

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
		<div className="flex h-full min-h-svh w-full items-stretch bg-default-background">
			<AuthHero headline={heroHeadline} subhead={heroSubhead} />
			<div className="flex w-1/2 flex-col items-center justify-center overflow-y-auto px-12 py-12 mobile:h-auto mobile:w-full mobile:grow mobile:shrink-0 mobile:basis-0 mobile:px-6 mobile:py-8">
				<div className="hidden items-start mobile:mb-8 mobile:flex mobile:h-auto mobile:w-full mobile:max-w-[384px] mobile:flex-none mobile:flex-row mobile:flex-nowrap mobile:items-center mobile:justify-start mobile:gap-3">
					<BrandMark size="md" tone="dark" />
				</div>
				<div className="flex w-full max-w-[384px] flex-col items-start gap-6">
					{children}
				</div>
			</div>
		</div>
	);
}
