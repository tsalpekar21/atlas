// SECURITY INVARIANT: this is the ONLY file from src/routes/admin/ that should
// be imported by src/app.ts. Child admin route files must be composed onto
// `adminApp` here so they inherit requireAdminMiddleware. Mounting a child
// route file directly onto the main app would bypass the admin guard.

import { Hono } from "hono";
import { requireAdminMiddleware } from "../../middleware/require-admin.ts";
import type { AppEnv } from "../../types.ts";
import { adminUserRoutes } from "./users.ts";

const base = new Hono<AppEnv>().use("*", requireAdminMiddleware);
export const adminApp = base.route("/", adminUserRoutes);
