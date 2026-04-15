"use client";

import { SidebarWithSections } from "@atlas/subframe/components/SidebarWithSections";
import { FeatherActivity } from "@subframe/core";

function SkeletonLine({ width }: { width: string }) {
	return (
		<div className={`h-4 rounded-md bg-neutral-200 animate-shimmer ${width}`} />
	);
}

export function AdminLayoutPending() {
	return (
		<div className="flex h-screen w-full items-start bg-default-background">
			<SidebarWithSections
				className="mobile:hidden"
				header={
					<div className="flex w-full items-center gap-2">
						<div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand-600">
							<FeatherActivity className="text-heading-3 font-heading-3 text-white" />
						</div>
						<span className="text-heading-3 font-heading-3 text-default-font">
							Atlas
						</span>
					</div>
				}
				footer={
					<div className="flex grow shrink-0 basis-0 items-center gap-2">
						<div className="h-8 w-8 flex-none rounded-full bg-neutral-200 animate-shimmer" />
						<div className="flex flex-1 flex-col gap-1">
							<SkeletonLine width="w-24" />
							<SkeletonLine width="w-12" />
						</div>
					</div>
				}
			>
				<SidebarWithSections.NavSection label="Resources">
					<div className="px-3 py-2">
						<SkeletonLine width="w-20" />
					</div>
				</SidebarWithSections.NavSection>
				<SidebarWithSections.NavSection label="Management">
					<div className="px-3 py-2">
						<SkeletonLine width="w-16" />
					</div>
				</SidebarWithSections.NavSection>
			</SidebarWithSections>
			<div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch overflow-hidden bg-neutral-50" />
		</div>
	);
}
