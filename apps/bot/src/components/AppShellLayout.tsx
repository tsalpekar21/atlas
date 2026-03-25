"use client";

import { IconButton } from "@atlas/subframe/components/IconButton";
// Radix Dialog (Portal + Overlay + Content): Subframe’s Drawer.Root does not render children,
// so we use @radix-ui/react-dialog directly for a working left sheet + backdrop.
import * as Dialog from "@radix-ui/react-dialog";
import { FeatherActivity, FeatherMenu, FeatherX } from "@subframe/core";
import { Link, Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar.tsx";

export function AppShellLayout() {
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const onChange = () => {
			if (mq.matches) setMobileNavOpen(false);
		};
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	return (
		<div className="flex h-screen w-full min-h-0 overflow-hidden">
			<div className="hidden shrink-0 md:flex">
				<AppSidebar />
			</div>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<div className="flex h-12 shrink-0 items-center gap-2 border-b border-solid border-neutral-border bg-default-background px-3 md:hidden">
					<Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
						<Dialog.Trigger asChild>
							<IconButton
								aria-label="Open navigation menu"
								icon={<FeatherMenu />}
								variant="neutral-tertiary"
							/>
						</Dialog.Trigger>
						<Dialog.Portal>
							<Dialog.Overlay className="fixed inset-0 z-50 bg-[#00000066]" />
							<Dialog.Content
								className="fixed inset-0 z-50 flex h-full w-full max-w-none flex-col bg-default-background shadow-lg outline-none"
								onOpenAutoFocus={(e) => e.preventDefault()}
							>
								<Dialog.Title className="sr-only">Navigation</Dialog.Title>
								<div className="flex h-12 shrink-0 items-center justify-end border-b border-solid border-neutral-border px-2">
									<Dialog.Close asChild>
										<IconButton
											aria-label="Close navigation menu"
											icon={<FeatherX />}
											variant="neutral-tertiary"
										/>
									</Dialog.Close>
								</div>
								<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
									<AppSidebar
										className="w-full min-w-0 border-r-0"
										onNavigate={closeMobileNav}
									/>
								</div>
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>
					<Link
						to="/patient-triage-demo"
						className="flex min-w-0 items-center gap-2 focus:outline-none"
						onClick={closeMobileNav}
					>
						<FeatherActivity className="shrink-0 text-heading-3 font-heading-3 text-brand-700" />
						<span className="truncate text-body-bold font-body-bold text-default-font">
							Atlas
						</span>
					</Link>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
