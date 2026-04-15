import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

/**
 * Sanity check for the test Postgres container — verifies that Drizzle
 * migrations ran in `global-setup.ts` and that core tables + the `vector`
 * extension are present.
 *
 * This file doesn't import from `src/db/index.ts` because that module
 * creates a pool against `env.DATABASE_URL` at import time; here we want
 * a fresh client bound to the container URL explicitly so the test is
 * self-contained.
 */
describe("integration: database container", () => {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL not set — worker-env.ts should have populated it",
		);
	}

	const client = postgres(databaseUrl, { max: 1 });
	const db = drizzle(client);

	beforeAll(() => {
		expect(databaseUrl).toMatch(/^postgres(ql)?:\/\//);
	});

	afterAll(async () => {
		await client.end();
	});

	test("the vector extension is installed (pgvector image)", async () => {
		const rows = await db.execute<{ extname: string }>(
			sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
		);
		expect(rows.length).toBe(1);
	});

	test("core tables from migrations exist", async () => {
		const rows = await db.execute<{ table_name: string }>(
			sql`SELECT table_name FROM information_schema.tables
			    WHERE table_schema = 'public' ORDER BY table_name`,
		);
		const tableNames = rows.map((r) => r.table_name);
		expect(tableNames).toContain("user");
		expect(tableNames).toContain("session");
		expect(tableNames).toContain("scraped_pages");
		expect(tableNames).toContain("chunks");
	});
});
