import type { Context } from "hono";
import type * as z from "zod";

/**
 * A single Cloud Tasks queue declaration. Pairs a queue name with its
 * target HTTP path on this API, a zod schema for the task payload, and the
 * handler that runs when the task is dispatched.
 *
 * The `TSchema` generic is what gives `enqueue(queueKey, payload)` its
 * per-queue payload type — the registry preserves the literal schema type
 * for each queue so `z.infer<Queues[K]["schema"]>` narrows correctly.
 */
export type QueueDef<
	TName extends string = string,
	TPath extends `/${string}` = `/${string}`,
	TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = {
	name: TName;
	path: TPath;
	schema: TSchema;
	handler: (
		payload: z.infer<TSchema>,
		c: Context,
	) => Promise<Response> | Response;
};

export function defineQueue<
	TName extends string,
	TPath extends `/${string}`,
	TSchema extends z.ZodTypeAny,
>(def: QueueDef<TName, TPath, TSchema>): QueueDef<TName, TPath, TSchema> {
	return def;
}
