import { logger } from "@atlas/logger";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { researchFindings } from "../../db/schema.ts";

interface MigrateAnonymousUserArgs {
	fromUserId: string;
	toUserId: string;
}

/**
 * Re-owns all data tied to an anonymous user when Better Auth's anonymous
 * plugin links the anonymous account to a newly identified user. Called
 * from the `onLinkAccount` callback on the `anonymous()` plugin.
 *
 * Safe to call concurrently with anything else — failures here are logged
 * but never thrown, so a partial migration won't block the user from
 * actually getting an identified account.
 */
export async function migrateAnonymousUserData({
	fromUserId,
	toUserId,
}: MigrateAnonymousUserArgs): Promise<void> {
	if (fromUserId === toUserId) return;

	try {
		await migrateMastraThreads(fromUserId, toUserId);
	} catch (error) {
		logger.error(
			{ err: error, fromUserId, toUserId },
			"Failed to migrate Mastra threads on anonymous link",
		);
	}

	try {
		await db
			.update(researchFindings)
			.set({ userId: toUserId })
			.where(eq(researchFindings.userId, fromUserId));
	} catch (error) {
		logger.error(
			{ err: error, fromUserId, toUserId },
			"Failed to migrate research findings on anonymous link",
		);
	}
}

async function migrateMastraThreads(
	fromUserId: string,
	toUserId: string,
): Promise<void> {
	const result = await db.transaction(async (tx) => {
		const threads = await tx.execute(sql`
			UPDATE mastra.mastra_threads
			SET "resourceId" = ${toUserId}
			WHERE "resourceId" = ${fromUserId}
		`);
		const messages = await tx.execute(sql`
			UPDATE mastra.mastra_messages
			SET "resourceId" = ${toUserId}
			WHERE "resourceId" = ${fromUserId}
		`);
		return {
			threadsUpdated: threads.count ?? 0,
			messagesUpdated: messages.count ?? 0,
		};
	});

	logger.info(
		{ fromUserId, toUserId, ...result },
		"Migrated Mastra threads + messages from anonymous user",
	);
}
