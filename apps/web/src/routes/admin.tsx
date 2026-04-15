import { Avatar } from "@atlas/subframe/components/Avatar";
import { DropdownMenu } from "@atlas/subframe/components/DropdownMenu";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { SidebarWithSections } from "@atlas/subframe/components/SidebarWithSections";
import * as SubframeCore from "@subframe/core";
import {
	FeatherActivity,
	FeatherGlobe,
	FeatherLogOut,
	FeatherMoreHorizontal,
	FeatherUsers,
} from "@subframe/core";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { AdminLayoutPending } from "@/components/admin/AdminLayoutPending";
import { authClient } from "@/lib/auth-client";
import {
	SESSION_QUERY_KEY,
	type Session,
	sessionQueryOptions,
} from "@/lib/session-query";

// Parent layout route at `/admin` — every file under src/routes/admin/ renders
// through this component, so its `beforeLoad` acts as the single client-side
// guard point for all admin pages. This guard is UX only: the server is the
// source of truth and independently verifies every admin API call via
// requireAdminMiddleware.
export const Route = createFileRoute("/admin")({
	ssr: false,
	loader: async ({ context }) => {
		let session: Session | null;
		try {
			session = await context.queryClient.ensureQueryData(sessionQueryOptions);
		} catch {
			throw redirect({ to: "/sign-in" });
		}
		if (!session?.user) {
			throw redirect({ to: "/sign-in" });
		}
		if (session.user.role !== "admin") {
			throw notFound();
		}
		return { adminUser: session.user };
	},
	pendingComponent: AdminLayoutPending,
	pendingMs: 0,
	component: AdminLayout,
});

function AdminLayout() {
	const { adminUser } = Route.useLoaderData();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const handleSignOut = useCallback(async () => {
		await authClient.signOut();
		await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
		await navigate({ to: "/sign-in" });
	}, [navigate, queryClient]);

	const initial = (
		adminUser.name?.[0] ??
		adminUser.email[0] ??
		"A"
	).toUpperCase();
	const displayName = adminUser.name || adminUser.email;

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
					<>
						<div className="flex grow shrink-0 basis-0 items-start gap-2">
							<Avatar image="">{initial}</Avatar>
							<div className="flex flex-col items-start">
								<span className="text-caption-bold font-caption-bold text-default-font">
									{displayName}
								</span>
								<span className="text-caption font-caption text-subtext-color">
									Admin
								</span>
							</div>
						</div>
						<SubframeCore.DropdownMenu.Root>
							<SubframeCore.DropdownMenu.Trigger asChild={true}>
								<IconButton size="small" icon={<FeatherMoreHorizontal />} />
							</SubframeCore.DropdownMenu.Trigger>
							<SubframeCore.DropdownMenu.Portal>
								<SubframeCore.DropdownMenu.Content
									side="top"
									align="end"
									sideOffset={4}
									asChild={true}
								>
									<DropdownMenu>
										<DropdownMenu.DropdownItem
											icon={<FeatherLogOut />}
											onSelect={() => {
												void handleSignOut();
											}}
										>
											Log out
										</DropdownMenu.DropdownItem>
									</DropdownMenu>
								</SubframeCore.DropdownMenu.Content>
							</SubframeCore.DropdownMenu.Portal>
						</SubframeCore.DropdownMenu.Root>
					</>
				}
			>
				<SidebarWithSections.NavSection label="Resources">
					<Link to="/admin" className="w-full no-underline">
						<SidebarWithSections.NavItem
							icon={<FeatherGlobe />}
							selected={pathname === "/admin" || pathname === "/admin/"}
						>
							Websites
						</SidebarWithSections.NavItem>
					</Link>
				</SidebarWithSections.NavSection>
				<SidebarWithSections.NavSection label="Management">
					<Link to="/admin/users" className="w-full no-underline">
						<SidebarWithSections.NavItem
							icon={<FeatherUsers />}
							selected={pathname.startsWith("/admin/users")}
						>
							Users
						</SidebarWithSections.NavItem>
					</Link>
				</SidebarWithSections.NavSection>
			</SidebarWithSections>
			<div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch overflow-hidden bg-neutral-50">
				<Outlet />
			</div>
		</div>
	);
}
