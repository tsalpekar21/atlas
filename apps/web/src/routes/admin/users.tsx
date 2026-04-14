import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listAdminUsers } from "@/lib/admin/admin-api-client";

export const Route = createFileRoute("/admin/users")({
	head: () => ({
		meta: [{ title: "Admin · Users — Atlas Health" }],
	}),
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["admin", "users"],
		queryFn: listAdminUsers,
	});

	if (isLoading) return <div className="p-8">Loading users…</div>;
	if (error)
		return (
			<div className="p-8 text-error-600">
				Failed to load users: {(error as Error).message}
			</div>
		);

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-4 p-8">
			<h1 className="text-2xl font-semibold">Users</h1>
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b">
						<th className="py-2">Email</th>
						<th className="py-2">Name</th>
						<th className="py-2">Role</th>
						<th className="py-2">Banned</th>
					</tr>
				</thead>
				<tbody>
					{data?.users.map((u) => (
						<tr key={u.id} className="border-b">
							<td className="py-2">{u.email}</td>
							<td className="py-2">{u.name}</td>
							<td className="py-2">{u.role ?? "user"}</td>
							<td className="py-2">{u.banned ? "yes" : "no"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
