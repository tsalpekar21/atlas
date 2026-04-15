import { logger } from "@atlas/logger";
import { env } from "../env.ts";
import { getLocationPath, getQueuePath, getTasksClient } from "./client.ts";
import { queues } from "./registry.ts";

/**
 * In local dev, make sure every queue in the registry exists in the
 * emulator. In production, queues are provisioned out-of-band (Terraform
 * / gcloud) with tuned retry/rate settings, so this is a no-op when
 * `CLOUD_TASKS_EMULATOR_HOST` is unset.
 *
 * Failures here are logged but not fatal — the API still boots so that
 * routes unrelated to tasks stay serviceable if the emulator is down.
 */
export async function ensureDevelopmentQueuesExist(): Promise<void> {
	if (!env.CLOUD_TASKS_EMULATOR_HOST) return;

	const client = getTasksClient();
	const parent = getLocationPath();

	for (const queue of Object.values(queues)) {
		const name = getQueuePath(queue.name);
		try {
			await client.getQueue({ name });
		} catch {
			try {
				await client.createQueue({ parent, queue: { name } });
				logger.info(
					{ queue: queue.name },
					"Created Cloud Tasks queue in emulator",
				);
			} catch (err) {
				logger.error(
					{ queue: queue.name, err },
					"Failed to create Cloud Tasks queue in emulator",
				);
			}
		}
	}
}
