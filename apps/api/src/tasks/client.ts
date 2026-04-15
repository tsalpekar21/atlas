import { CloudTasksClient } from "@google-cloud/tasks";
import { credentials } from "@grpc/grpc-js";
import { env } from "../env.ts";

let cached: CloudTasksClient | null = null;

export function getTasksClient(): CloudTasksClient {
	if (cached) return cached;
	if (env.CLOUD_TASKS_EMULATOR_HOST) {
		const [host, portStr] = env.CLOUD_TASKS_EMULATOR_HOST.split(":");
		if (!host || !portStr) {
			throw new Error(
				`CLOUD_TASKS_EMULATOR_HOST must be host:port, got ${env.CLOUD_TASKS_EMULATOR_HOST}`,
			);
		}
		cached = new CloudTasksClient({
			servicePath: host,
			port: Number(portStr),
			sslCreds: credentials.createInsecure(),
		});
	} else {
		cached = new CloudTasksClient();
	}
	return cached;
}

export function getLocationPath(): string {
	return `projects/${env.GCLOUD_PROJECT}/locations/${env.GCLOUD_LOCATION}`;
}

export function getQueuePath(queueName: string): string {
	return `${getLocationPath()}/queues/${queueName}`;
}

export function getTargetBaseUrl(): string {
	return env.CLOUD_TASKS_TARGET_BASE_URL;
}
