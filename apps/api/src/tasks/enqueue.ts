import { logger } from "@atlas/logger";
import type { protos } from "@google-cloud/tasks";
import type * as z from "zod";
import { getQueuePath, getTargetBaseUrl, getTasksClient } from "./client.ts";
import { type QueueKey, type Queues, queues } from "./registry.ts";
import { signBody } from "./sign.ts";

export type EnqueueOptions = {
	/**
	 * Delay before Cloud Tasks dispatches the task. Accepts a Date (absolute)
	 * — the emulator and real service both respect it.
	 */
	scheduleTime?: Date;
	/**
	 * Optional stable task id for dedupe. Cloud Tasks will reject a second
	 * createTask with the same name for the same queue for up to an hour
	 * after deletion — useful for idempotent enqueuing.
	 */
	dedupeId?: string;
};

/**
 * Cloud Tasks doesn't expose a batch createTasks RPC — the SDK only has
 * per-task createTask. This cap bounds how many we fire in parallel from
 * `enqueueMany` so a large fan-out (e.g. re-embedding a website with
 * hundreds of pages) doesn't hammer the API or exhaust sockets.
 */
const ENQUEUE_MANY_CONCURRENCY = 16;

type CreateTaskRequest = protos.google.cloud.tasks.v2.ICreateTaskRequest;

function buildCreateTaskRequest<K extends QueueKey>(
	key: K,
	payload: z.infer<Queues[K]["schema"]>,
	options: EnqueueOptions,
): CreateTaskRequest {
	const queue = queues[key];
	const parsed = queue.schema.parse(payload);
	const body = Buffer.from(JSON.stringify(parsed));
	const signature = signBody(body);
	const parent = getQueuePath(queue.name);

	return {
		parent,
		task: {
			name: options.dedupeId
				? `${parent}/tasks/${options.dedupeId}`
				: undefined,
			scheduleTime: options.scheduleTime
				? {
						seconds: Math.floor(options.scheduleTime.getTime() / 1000),
					}
				: undefined,
			httpRequest: {
				httpMethod: "POST",
				url: `${getTargetBaseUrl()}${queue.path}`,
				headers: {
					"content-type": "application/json",
					"x-atlas-task-signature": signature,
				},
				body,
			},
		},
	};
}

/**
 * Type-safe enqueue. `K` narrows `payload` to the zod-inferred type of
 * the selected queue's schema — e.g. `enqueue("embedPage", { pageId })`.
 */
export async function enqueue<K extends QueueKey>(
	key: K,
	payload: z.infer<Queues[K]["schema"]>,
	options: EnqueueOptions = {},
): Promise<string> {
	const request = buildCreateTaskRequest(key, payload, options);
	const client = getTasksClient();
	const [task] = await client.createTask(request);
	logger.info(
		{ queue: queues[key].name, taskName: task.name ?? null },
		"task enqueued",
	);
	return task.name ?? "";
}

/**
 * Bulk enqueue: fans out one createTask per payload with bounded parallelism.
 * Cloud Tasks has no batch RPC, so this is a client-side fan-out. All
 * payloads target the same queue. `dedupeId` isn't supported here since a
 * single id across a batch would collide — call `enqueue` in a loop if you
 * need per-task dedupe.
 */
export async function enqueueMany<K extends QueueKey>(
	key: K,
	payloads: ReadonlyArray<z.infer<Queues[K]["schema"]>>,
	options: Pick<EnqueueOptions, "scheduleTime"> = {},
): Promise<string[]> {
	if (payloads.length === 0) return [];
	const client = getTasksClient();
	const queueName = queues[key].name;
	const results: string[] = new Array(payloads.length);
	let cursor = 0;

	async function worker() {
		while (true) {
			const index = cursor++;
			if (index >= payloads.length) return;
			const request = buildCreateTaskRequest(key, payloads[index], options);
			const [task] = await client.createTask(request);
			results[index] = task.name ?? "";
		}
	}

	const workerCount = Math.min(ENQUEUE_MANY_CONCURRENCY, payloads.length);
	await Promise.all(Array.from({ length: workerCount }, () => worker()));

	logger.info(
		{ queue: queueName, count: payloads.length },
		"task batch enqueued",
	);
	return results;
}
