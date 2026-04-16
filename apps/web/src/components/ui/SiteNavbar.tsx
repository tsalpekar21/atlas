import { Avatar } from "@atlas/subframe/components/Avatar";
import { Button } from "@atlas/subframe/components/Button";
import { DropdownMenu } from "@atlas/subframe/components/DropdownMenu";
import { LinkButton } from "@atlas/subframe/components/LinkButton";
import * as SubframeCore from "@subframe/core";
import { FeatherArrowRight, FeatherLogOut, toast } from "@subframe/core";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { SESSION_QUERY_KEY } from "@/lib/session-query";
import { BrandMark } from "./BrandMark";

interface SiteNavbarProps {
	variant?: "default" | "auth";
}

export function SiteNavbar({ variant = "default" }: SiteNavbarProps = {}) {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const isAuthed = Boolean(session?.user && session.user.isAnonymous !== true);

	const handleSignOut = useCallback(async () => {
		await authClient.signOut();
		await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
		await navigate({ to: "/" });
		toast.success("You've been signed out successfully.");
	}, [navigate, queryClient]);

	const initial = (session?.user?.name?.[0] ?? "A").toUpperCase();

	if (variant === "auth") {
		return (
			<div className="flex w-full items-center justify-between px-6 py-4 mobile:px-4 mobile:py-4">
				<Link to="/" className="no-underline">
					<div className="mobile:hidden">
						<BrandMark size="sm" tone="light" />
					</div>
					<div className="hidden mobile:block">
						<BrandMark size="sm" tone="dark" />
					</div>
				</Link>
			</div>
		);
	}

	return (
		<div className="flex w-full items-center justify-between px-6 py-4 mobile:px-4 mobile:py-4">
			<Link to="/" className="no-underline">
				<BrandMark size="sm" tone="dark" />
			</Link>
			<div className="flex items-center gap-4">
				{isPending ? (
					<div className="w-8 h-8 rounded-full bg-neutral-200 animate-shimmer" />
				) : isAuthed ? (
					<SubframeCore.DropdownMenu.Root>
						<SubframeCore.DropdownMenu.Trigger asChild={true}>
							<Avatar className="cursor-pointer">
								<span className="font-body">{initial}</span>
							</Avatar>
						</SubframeCore.DropdownMenu.Trigger>
						<SubframeCore.DropdownMenu.Portal>
							<SubframeCore.DropdownMenu.Content
								side="bottom"
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
				) : (
					<>
						<Link to="/sign-in" className="no-underline mobile:hidden">
							<LinkButton variant="neutral">Sign in</LinkButton>
						</Link>
						<Link to="/sign-up" className="no-underline">
							<Button icon={<FeatherArrowRight />}>Get started</Button>
						</Link>
					</>
				)}
			</div>
		</div>
	);
}
