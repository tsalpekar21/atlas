import { describe, expect, test } from "vitest";
import { signBody, verifyBody } from "./sign.ts";

describe("tasks/sign", () => {
	test("round-trips a signed body", () => {
		const body = JSON.stringify({ pageId: "abc-123" });
		const signature = signBody(body);
		expect(verifyBody(body, signature)).toBe(true);
	});

	test("rejects a body whose payload was tampered with", () => {
		const body = JSON.stringify({ pageId: "abc-123" });
		const tampered = JSON.stringify({ pageId: "abc-124" });
		const signature = signBody(body);
		expect(verifyBody(tampered, signature)).toBe(false);
	});

	test("rejects a malformed hex signature without throwing", () => {
		const body = JSON.stringify({ pageId: "abc-123" });
		expect(verifyBody(body, "not-hex")).toBe(false);
	});

	test("produces a deterministic hex signature for the same body", () => {
		const body = "stable-body";
		expect(signBody(body)).toBe(signBody(body));
	});
});
