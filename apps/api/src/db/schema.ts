import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
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
	role: text("role"),
	banned: boolean("banned").default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires"),
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
		impersonatedBy: uuid("impersonated_by"),
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

/**
 * Canonical website rows that group many `scraped_pages` together by root
 * domain. Created so the admin UI can present the scrape corpus at the
 * website level (title + root domain + page counts) instead of page-by-page.
 */
export const scrapedWebsites = pgTable(
	"scraped_websites",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title").notNull(),
		rootDomain: text("root_domain").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("scraped_websites_root_domain_idx").on(table.rootDomain)],
);

/**
 * Scraped web pages from Firecrawl. One row per unique URL.
 * Used by the `scripts/scrape-rupa.ts` batch script.
 */
export const scrapedPages = pgTable(
	"scraped_pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		url: text("url").notNull().unique(),
		title: text("title"),
		description: text("description"),
		markdown: text("markdown"),
		metadata: jsonb("metadata"),
		scrapedWebsiteId: uuid("scraped_website_id").references(
			() => scrapedWebsites.id,
			{ onDelete: "cascade" },
		),
		scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("scraped_pages_url_idx").on(table.url),
		index("scraped_pages_scraped_website_id_idx").on(table.scrapedWebsiteId),
	],
);

/**
 * Chunks of scraped page markdown, split by Mastra's MDocument chunker and
 * embedded via Google `text-embedding-004` for RAG retrieval. The embedding
 * vectors themselves live in a Mastra-managed `PgVector` index keyed by this
 * row's UUID; this table holds the authoritative text + FK metadata so the
 * admin UI and future retrieval joins can reference chunks without touching
 * the vector index directly.
 */
export const chunks = pgTable(
	"chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		scrapedPageId: uuid("scraped_page_id")
			.notNull()
			.references(() => scrapedPages.id, { onDelete: "cascade" }),
		scrapedWebsiteId: uuid("scraped_website_id").references(
			() => scrapedWebsites.id,
			{ onDelete: "cascade" },
		),
		chunkIndex: integer("chunk_index").notNull(),
		content: text("content").notNull(),
		tokenCount: integer("token_count").notNull(),
		status: text("status").notNull().default("pending"),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("chunks_scraped_page_id_idx").on(
			table.scrapedPageId,
			table.chunkIndex,
		),
		index("chunks_scraped_website_id_idx").on(table.scrapedWebsiteId),
		index("chunks_status_idx").on(table.status),
	],
);
