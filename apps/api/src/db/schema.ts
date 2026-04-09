import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	isAnonymous: boolean("is_anonymous").default(false),
	birthdate: date("birthdate"),
	phoneNumber: text("phone_number"),
});

export const session = pgTable(
	"session",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

/**
 * Background research rounds produced by `backgroundResearchWorkflow`.
 *
 * One row per evaluation the planner actually decided to run. Rows with
 * `status = 'skipped'` mean the chart was unchanged since the last round
 * (gate-by-hash). `synthesis` and the breakout jsonb columns are populated
 * only once the run reaches `complete`.
 */
export const researchFindings = pgTable(
	"research_findings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		threadId: text("thread_id").notNull(),
		userId: text("user_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		/** Hash of the interview-relevant chart sections at plan time. */
		chartHash: text("chart_hash").notNull(),
		/** 'running' | 'complete' | 'skipped' | 'failed' */
		status: text("status").notNull(),
		brief: jsonb("brief"),
		synthesis: jsonb("synthesis"),
		evidenceItems: jsonb("evidence_items"),
		suggestedQuestions: jsonb("suggested_questions"),
		escalationFlags: jsonb("escalation_flags"),
		whatChanged: text("what_changed"),
		errorMessage: text("error_message"),
	},
	(table) => [
		index("research_findings_thread_created_idx").on(
			table.threadId,
			table.createdAt,
		),
	],
);

/**
 * Per-message debug snapshots written by the chat stream flush callback.
 *
 * One row per assistant turn, keyed by the Mastra message id. Captures
 * the working-memory state at the time the message was generated and a
 * pointer to the latest completed research round that the agent was
 * looking at during that turn (i.e. the round produced by the PREVIOUS
 * turn's background workflow). Used exclusively by the dev-only
 * `/debug/:threadId/snapshots` endpoint.
 */
export const messageDebugSnapshots = pgTable(
	"message_debug_snapshots",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		messageId: text("message_id").notNull().unique(),
		threadId: text("thread_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		workingMemory: text("working_memory"),
		researchRoundId: uuid("research_round_id").references(
			() => researchFindings.id,
			{ onDelete: "set null" },
		),
	},
	(table) => [
		index("message_debug_thread_created_idx").on(
			table.threadId,
			table.createdAt,
		),
	],
);
