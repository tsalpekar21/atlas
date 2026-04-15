import * as z from "zod";
import { embedPage } from "../services/chunks/embed-page.ts";
import { runResearchWorkflowForTask } from "../services/research.ts";
import { defineQueue } from "./define.ts";

/**
 * Central queue registry. Add a new entry here and the enqueue function
 * (with per-queue payload types) and the task router will pick it up
 * automatically. Each queue's `path` must live under `/tasks` — the
 * router mounts everything at that prefix.
 */
export const queues = {
	embedPage: defineQueue({
		name: "embed-page",
		path: "/tasks/embed-page",
		schema: z.object({
			pageId: z.string().uuid(),
		}),
		handler: async (payload, c) => {
			const result = await embedPage(payload.pageId);
			return c.json(result);
		},
	}),
	runResearch: defineQueue({
		name: "run-research",
		path: "/tasks/run-research",
		schema: z.object({
			threadId: z.string().min(1),
			userId: z.string().min(1),
		}),
		// Cloud Tasks' default dispatch deadline is 10 minutes. The research
		// workflow's two parallel workers + synthesis can plausibly exceed
		// that on slower days, so we bump to the 30-minute ceiling.
		dispatchDeadlineSeconds: 1800,
		handler: async (payload, c) => {
			const result = await runResearchWorkflowForTask(payload);
			return c.json(result);
		},
	}),
} as const;

export type Queues = typeof queues;
export type QueueKey = keyof Queues;
