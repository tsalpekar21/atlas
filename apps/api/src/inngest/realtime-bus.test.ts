import { describe, expect, test, vi } from "vitest";
import {
	publishResearchStatus,
	subscribeResearchStatus,
} from "./realtime-bus.ts";

/**
 * Unit tests for the in-process realtime bus used to stream workflow
 * status to the SSE route. Fully synchronous — the bus is a thin
 * EventEmitter wrapper, no async I/O, no DB, no Mastra. Each test
 * uses a unique threadId so tests don't step on each other even if
 * vitest runs them in parallel.
 */

let threadSeq = 0;
const nextThread = () => `bus-test-${Date.now()}-${threadSeq++}`;

describe("realtime-bus", () => {
	test("publish delivers the event to a subscribed handler", () => {
		const threadId = nextThread();
		const handler = vi.fn();
		const unsubscribe = subscribeResearchStatus(threadId, handler);

		publishResearchStatus(threadId, { status: "researching", roundId: "r1" });

		expect(handler).toHaveBeenCalledTimes(1);
		const payload = handler.mock.calls[0]?.[0];
		expect(payload).toMatchObject({ status: "researching", roundId: "r1" });
		expect(typeof payload.at).toBe("string");
		// ISO 8601 timestamp
		expect(() => new Date(payload.at).toISOString()).not.toThrow();

		unsubscribe();
	});

	test("unsubscribe stops delivery", () => {
		const threadId = nextThread();
		const handler = vi.fn();
		const unsubscribe = subscribeResearchStatus(threadId, handler);
		unsubscribe();

		publishResearchStatus(threadId, { status: "complete", roundId: "r2" });

		expect(handler).not.toHaveBeenCalled();
	});

	test("events are isolated by threadId", () => {
		const threadA = nextThread();
		const threadB = nextThread();
		const handlerA = vi.fn();
		const handlerB = vi.fn();
		const unsubA = subscribeResearchStatus(threadA, handlerA);
		const unsubB = subscribeResearchStatus(threadB, handlerB);

		publishResearchStatus(threadA, { status: "planning" });

		expect(handlerA).toHaveBeenCalledTimes(1);
		expect(handlerB).not.toHaveBeenCalled();

		unsubA();
		unsubB();
	});

	test("multiple subscribers on one thread all receive events", () => {
		const threadId = nextThread();
		const h1 = vi.fn();
		const h2 = vi.fn();
		const h3 = vi.fn();
		const unsubs = [
			subscribeResearchStatus(threadId, h1),
			subscribeResearchStatus(threadId, h2),
			subscribeResearchStatus(threadId, h3),
		];

		publishResearchStatus(threadId, {
			status: "failed",
			reason: "worker crash",
		});

		expect(h1).toHaveBeenCalledTimes(1);
		expect(h2).toHaveBeenCalledTimes(1);
		expect(h3).toHaveBeenCalledTimes(1);
		expect(h1.mock.calls[0]?.[0].reason).toBe("worker crash");

		for (const u of unsubs) u();
	});

	test("publishing to a thread with no subscribers is a no-op (no throw)", () => {
		const threadId = nextThread();
		expect(() =>
			publishResearchStatus(threadId, { status: "skipped" }),
		).not.toThrow();
	});

	test("payload `at` is a fresh ISO timestamp per publish", async () => {
		const threadId = nextThread();
		const handler = vi.fn();
		const unsubscribe = subscribeResearchStatus(threadId, handler);

		publishResearchStatus(threadId, { status: "planning" });
		// Wait enough ms for the clock tick.
		await new Promise((r) => setTimeout(r, 5));
		publishResearchStatus(threadId, { status: "researching" });

		expect(handler).toHaveBeenCalledTimes(2);
		const first = handler.mock.calls[0]?.[0].at;
		const second = handler.mock.calls[1]?.[0].at;
		expect(first).not.toBe(second);
		expect(new Date(second).getTime()).toBeGreaterThanOrEqual(
			new Date(first).getTime(),
		);

		unsubscribe();
	});
});
