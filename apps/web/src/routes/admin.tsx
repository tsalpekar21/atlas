import {
	createFileRoute,
	notFound,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

// Parent layout route at `/admin` — every file under src/routes/admin/ renders
// through this component, so its `beforeLoad` acts as the single client-side
// guard point for all admin pages. This guard is UX only: the server is the
// source of truth and independently verifies every admin API call via
// requireAdminMiddleware.
export const Route = createFileRoute("/admin")({
	ssr: false,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data?.user) {
			throw redirect({ to: "/sign-in" });
		}
		if (session.data.user.role !== "admin") {
			throw notFound();
		}
		return { adminUser: session.data.user };
	},
	component: AdminLayout,
});

function AdminLayout() {
	return <Outlet />;
}
