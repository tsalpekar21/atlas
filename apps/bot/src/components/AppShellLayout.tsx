"use client";

import { AppSidebar } from "@/components/AppSidebar.tsx";
import { Outlet } from "@tanstack/react-router";

export function AppShellLayout() {
	return (
		<div className="flex h-screen w-full min-h-0 overflow-hidden">
			<div className="shrink-0">
				<AppSidebar />
			</div>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<Outlet />
			</div>
		</div>
	);
}
