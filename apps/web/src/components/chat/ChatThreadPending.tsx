"use client";

import { motion } from "framer-motion";
import { ChatHeader } from "./ChatPage";

function SkeletonLine({
	width = "full",
}: {
	width?: "full" | "75%" | "60%" | "50%" | "40%" | "33%";
}) {
	const widthClass = {
		full: "w-full",
		"75%": "w-3/4",
		"60%": "w-3/5",
		"50%": "w-1/2",
		"40%": "w-2/5",
		"33%": "w-1/3",
	};

	return (
		<div
			className={`h-5 rounded-md bg-neutral-200 ${widthClass[width]} animate-shimmer`}
		/>
	);
}

function SkeletonBubble({
	align = "left",
	isUser = false,
}: {
	align?: "left" | "right";
	isUser?: boolean;
}) {
	return (
		<div
			className={`flex w-full min-w-0 ${align === "right" ? "justify-end" : "justify-start"}`}
		>
			<div
				className={`max-w-[85%] min-w-0 rounded-lg px-4 py-3 ${
					isUser ? "bg-brand-100" : "bg-neutral-100"
				}`}
			>
				<div className="flex flex-col gap-2">
					<SkeletonLine width="full" />
					<SkeletonLine width="75%" />
					<SkeletonLine width="60%" />
				</div>
			</div>
		</div>
	);
}

export function ChatThreadPending() {
	return (
		<div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-default-background">
			<ChatHeader />

			<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
				<div className="mx-auto flex min-h-full w-full max-w-[768px] flex-col px-6 py-6 mobile:px-4 mobile:py-4">
					<div className="flex-1" aria-hidden="true" />

					<div className="flex shrink-0 flex-col gap-4">
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
						>
							<SkeletonBubble align="left" />
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.35,
								ease: [0.22, 1, 0.36, 1],
								delay: 0.1,
							}}
						>
							<SkeletonBubble align="right" isUser />
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.35,
								ease: [0.22, 1, 0.36, 1],
								delay: 0.2,
							}}
						>
							<SkeletonBubble align="left" />
						</motion.div>
					</div>

					<div
						className="h-px w-full shrink-0 scroll-mb-2"
						aria-hidden="true"
					/>
				</div>
			</div>

			<div className="border-t border-solid border-neutral-border px-6 py-4 mobile:px-4">
				<div className="mx-auto flex w-full max-w-[768px] flex-col gap-3">
					<div className="relative w-full">
						<div className="box-border min-h-[108px] w-full rounded-md border border-solid border-neutral-border bg-default-background px-3 py-3">
							<div className="flex flex-col gap-2 pb-12">
								<SkeletonLine width="33%" />
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<SkeletonLine width="40%" />
						<div className="flex flex-wrap justify-end gap-2">
							<div className="h-8 w-20 rounded-md bg-neutral-200 animate-shimmer" />
							<div className="h-8 w-24 rounded-md bg-neutral-200 animate-shimmer" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
