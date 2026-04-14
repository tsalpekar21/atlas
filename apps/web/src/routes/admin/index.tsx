import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
	head: () => ({
		meta: [{ title: "Admin — Atlas Health" }],
	}),
	component: AdminDashboard,
});

function AdminDashboard() {
	const { adminUser } = Route.useRouteContext();
	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
			<div>
				<h1 className="text-2xl font-semibold">Admin</h1>
				<p className="text-sm text-neutral-600">
					Signed in as {adminUser.email}
				</p>
			</div>
			<nav className="flex flex-col gap-2">
				<Link to="/admin/users" className="text-brand-600 underline">
					Manage users
				</Link>
			</nav>
		</div>
	);
}
