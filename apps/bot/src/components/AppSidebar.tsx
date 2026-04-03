"use client";

import { IconButton } from "@atlas/subframe/components/IconButton";
import { SidebarWithSections } from "@atlas/subframe/components/SidebarWithSections";
import {
	FeatherActivity,
	FeatherMessageSquare,
	FeatherPlus,
	FeatherTrash2,
} from "@subframe/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Link,
	useNavigate,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import { deleteThread, listThreads } from "@/server/thread-functions";

interface AppSidebarProps {
	children?: React.ReactNode;
	/** Called after in-app navigation (e.g. close mobile drawer). */
	onNavigate?: () => void;
	/** Merged into `SidebarWithSections` root (e.g. `w-full border-r-0` for full-width mobile). */
	className?: string;
}

export function AppSidebar({
	children,
	onNavigate,
	className,
}: AppSidebarProps) {
	const onNavigateRef = useRef(onNavigate);
	onNavigateRef.current = onNavigate;
	const router = useRouter();
	const threadsQuery = useQuery({
		queryKey: ["threads"],
		queryFn: () => listThreads(),
	});
	const navigate = useNavigate();
	const handleNewThread = useCallback(() => {
		const newId = crypto.randomUUID();
		navigate({ to: "/patient-triage-demo", search: { threadId: newId } });
		onNavigate?.();
	}, [navigate, onNavigate]);

	const handleSelectThread = useCallback(
		(id: string) => {
			navigate({ to: "/patient-triage-demo", search: { threadId: id } });
			onNavigate?.();
		},
		[navigate, onNavigate],
	);

	const location = useRouterState({ select: (s) => s.location });
	const threadId =
		location.pathname === "/patient-triage-demo"
			? (new URLSearchParams(location.search).get("threadId") ?? undefined)
			: undefined;

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteThread({ data: { threadId: id } }),
		onSuccess: (_, deletedId) => {
			router.invalidate();
			if (threadId === deletedId) {
				navigate({ to: "/patient-triage-demo", search: {} });
				onNavigateRef.current?.();
			}
		},
	});

	// Pathname only — matchRoute / Link active default to includeSearch, so
	// /patient-triage-demo?threadId=… would not match /patient-triage-demo.
	const { pathname } = location;
	const isTriage = pathname === "/patient-triage-demo";

	return (
		<SidebarWithSections
			className={className}
			header={
				<Link
					to="/patient-triage-demo"
					className="flex items-center gap-2 focus:outline-none"
					onClick={() => onNavigate?.()}
				>
					<FeatherActivity className="text-heading-3 font-heading-3 text-brand-700" />
					<span className="text-body-bold font-body-bold text-default-font">
						Atlas
					</span>
				</Link>
			}
		>
			<SidebarWithSections.NavSection label="Triage">
				<Link
					to="/patient-triage-demo"
					className="w-full"
					onClick={() => onNavigate?.()}
				>
					<SidebarWithSections.NavItem
						icon={<FeatherActivity />}
						selected={!!isTriage}
					>
						Patient Triage
					</SidebarWithSections.NavItem>
				</Link>
			</SidebarWithSections.NavSection>
			<SidebarWithSections.NavSection
				label={
					<div className="flex w-full items-center justify-between">
						<span>Conversations</span>
						<IconButton
							size="small"
							icon={<FeatherPlus />}
							onClick={handleNewThread}
						/>
					</div>
				}
			>
				{threadsQuery.isLoading ? (
					<div className="flex w-full flex-col items-center gap-2 py-4">
						<span className="text-caption font-caption text-subtext-color">
							Loading...
						</span>
					</div>
				) : threadsQuery.data?.threads.length === 0 ? (
					<div className="flex w-full flex-col items-center gap-2 py-4">
						<span className="text-caption font-caption text-subtext-color">
							No triages yet
						</span>
					</div>
				) : (
					threadsQuery.data?.threads.map((thread) => (
						<SidebarWithSections.NavItem
							key={thread.id}
							icon={<FeatherMessageSquare />}
							selected={thread.id === threadId}
							onClick={() => handleSelectThread(thread.id)}
							rightSlot={
								<IconButton
									size="small"
									variant="destructive-tertiary"
									icon={<FeatherTrash2 />}
									onClick={(e) => {
										e.stopPropagation();
										deleteMutation.mutate(thread.id);
									}}
								/>
							}
						>
							{thread.title ||
								`Triage ${new Date(thread.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}`}
						</SidebarWithSections.NavItem>
					))
				)}
			</SidebarWithSections.NavSection>

			{children}
		</SidebarWithSections>
	);
}
