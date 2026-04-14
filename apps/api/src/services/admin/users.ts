import { desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { user } from "../../db/schema.ts";

export async function listAllUsers() {
	return db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			banned: user.banned,
			createdAt: user.createdAt,
		})
		.from(user)
		.orderBy(desc(user.createdAt));
}
