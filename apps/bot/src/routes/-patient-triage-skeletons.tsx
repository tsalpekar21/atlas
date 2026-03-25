"use client";

import { IconWithBackground } from "@atlas/subframe/components/IconWithBackground";
import { FeatherActivity, FeatherCircle } from "@subframe/core";

function SkeletonLine({ width = "100%" }: { width?: string }) {
	return (
		<div
			className="h-4 animate-pulse rounded bg-neutral-200"
			style={{ width }}
		/>
	);
}

export function MessagesSkeleton() {
	return (
		<div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 overflow-hidden">
			{/* Assistant message */}
			<div className="flex w-full items-start gap-3">
				<div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
				<div className="flex flex-col gap-2">
					<SkeletonLine width="280px" />
					<SkeletonLine width="220px" />
				</div>
			</div>

			{/* User message */}
			<div className="flex w-full items-start justify-end gap-3">
				<div className="flex flex-col items-end gap-2">
					<div className="h-10 w-48 animate-pulse rounded-lg bg-brand-200" />
					<div className="h-3 w-12 animate-pulse rounded bg-neutral-200" />
				</div>
				<div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
			</div>

			{/* Assistant message with options */}
			<div className="flex w-full items-start gap-3">
				<div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-2">
						<SkeletonLine width="320px" />
						<SkeletonLine width="260px" />
					</div>
					<div className="flex gap-2">
						<div className="h-8 w-20 animate-pulse rounded-md bg-neutral-200" />
						<div className="h-8 w-24 animate-pulse rounded-md bg-neutral-200" />
						<div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
					</div>
				</div>
			</div>

			{/* User message */}
			<div className="flex w-full items-start justify-end gap-3">
				<div className="flex flex-col items-end gap-2">
					<div className="h-10 w-32 animate-pulse rounded-lg bg-brand-200" />
					<div className="h-3 w-12 animate-pulse rounded bg-neutral-200" />
				</div>
				<div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
			</div>

			{/* Assistant message */}
			<div className="flex w-full items-start gap-3">
				<div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
				<div className="flex flex-col gap-2">
					<SkeletonLine width="300px" />
					<SkeletonLine width="180px" />
				</div>
			</div>
		</div>
	);
}

export function InputSkeleton() {
	return (
		<div className="flex w-full min-w-0 items-center gap-2 border-t border-solid border-neutral-border bg-default-background px-4 py-3 md:gap-3 md:px-6">
			<div className="h-8 w-8 animate-pulse rounded-md bg-neutral-100" />
			<div className="h-10 flex-1 animate-pulse rounded-md border border-solid border-neutral-border bg-neutral-50" />
			<div className="h-10 w-20 animate-pulse rounded-md bg-neutral-100" />
		</div>
	);
}

export function ChatContentSkeleton() {
	return (
		<>
			<div className="flex w-full min-w-0 grow shrink-0 basis-0 flex-col items-start gap-4 overflow-hidden px-4 py-4 md:px-6 md:py-6">
				<MessagesSkeleton />
			</div>
			<InputSkeleton />
		</>
	);
}

export function ChatAreaSkeleton() {
	return (
		<div className="flex grow shrink-0 basis-0 flex-col items-start bg-neutral-50 h-screen">
			<div className="flex w-full flex-col items-start border-b border-solid border-neutral-border bg-default-background px-4 py-4 md:px-6">
				<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 items-center gap-3 sm:gap-4">
						<IconWithBackground
							variant="brand"
							size="large"
							icon={<FeatherActivity />}
							square={false}
						/>
						<div className="flex min-w-0 flex-col items-start gap-1">
							<span className="text-heading-3 font-heading-3 text-default-font md:text-heading-2 md:font-heading-2">
								SkinCare Dermatology
							</span>
							<span className="text-caption font-caption text-subtext-color">
								Patient Triage Assistant
							</span>
						</div>
					</div>
					<div className="flex w-fit shrink-0 items-center gap-2 self-start rounded-full bg-success-100 px-3 py-1 sm:self-center">
						<FeatherCircle className="text-body font-body text-success-700" />
						<span className="text-caption-bold font-caption-bold text-success-700">
							AI Powered
						</span>
					</div>
				</div>
			</div>

			<MessagesSkeleton />

			<div className="flex w-full min-w-0 items-center gap-2 border-t border-solid border-neutral-border bg-default-background px-4 py-3 md:gap-3 md:px-6">
				<div className="h-8 w-8 rounded-md bg-neutral-100" />
				<div className="h-10 flex-1 rounded-md border border-solid border-neutral-border bg-neutral-50" />
				<div className="h-10 w-20 rounded-md bg-neutral-100" />
			</div>

			<div className="flex w-full flex-col items-start border-t border-solid border-neutral-border bg-default-background px-4 py-3 md:px-6">
				<span className="text-caption font-caption text-subtext-color">
					This triage is for informational purposes only and does not replace
					medical advice. For emergencies, call 911 or visit your nearest
					emergency room.
				</span>
			</div>
		</div>
	);
}
