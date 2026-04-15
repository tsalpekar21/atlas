import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, test } from "vitest";
import { getLocationPath, getTasksClient } from "../../src/tasks/client.ts";
import { enqueue } from "../../src/tasks/enqueue.ts";
import { queues } from "../../src/tasks/registry.ts";

/**
 * Exercises the real Cloud Tasks code path against the aertje emulator
 * container started in `global-setup.ts`:
 *
 *   getTasksClient() → client.createQueue → enqueue() → emulator has task
 *
 * We don't wait for delivery here. Delivery targets
 * `CLOUD_TASKS_TARGET_BASE_URL` (`host.docker.internal:4111` by default),
 * which has no listener in this suite — the point is to verify the create
 * path: HMAC signing + SDK round-trip + emulator state. A follow-up test
 * that stands up a real target server and asserts HMAC-verified delivery
 * would slot in alongside this file.
 */
describe("integration: cloud tasks emulator", () => {
	const client = getTasksClient();
	const parent = getLocationPath();

	afterAll(() => {
		// The client caches one instance module-wide; closing it here would
		// break any follow-up test that imports it. Leave it open; the
		// emulator container is torn down in global setup teardown.
	});

	test("creates the embed-page queue and enqueues a task", async () => {
		const queue = queues.embedPage;
		const queueName = `${parent}/queues/${queue.name}`;

		// Ensure the queue exists in the emulator (idempotent: getQueue first,
		// create only on miss — mirrors `ensureDevelopmentQueuesExist`).
		try {
			await client.getQueue({ name: queueName });
		} catch {
			await client.createQueue({ parent, queue: { name: queueName } });
		}

		const pageId = randomUUID();
		const taskName = await enqueue("embedPage", { pageId });

		expect(taskName).toContain(`/queues/${queue.name}/tasks/`);

		const [listed] = await client.listTasks({ parent: queueName });
		const matching = (listed ?? []).find((t) => t.name === taskName);
		expect(matching).toBeDefined();

		// Verify the HTTP request the emulator will fire carries our HMAC
		// header — this is the contract that `requireCloudTasksAuth` checks.
		const headers = matching?.httpRequest?.headers ?? {};
		expect(headers["x-atlas-task-signature"]).toBeTruthy();
		expect(headers["content-type"]).toBe("application/json");

		// Cleanup: delete the task so repeated runs stay clean even if the
		// emulator persists state across invocations.
		if (taskName) {
			try {
				await client.deleteTask({ name: taskName });
			} catch {
				// already delivered / deleted — ignore
			}
		}
	});
});
