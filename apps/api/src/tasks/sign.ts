import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.ts";

const ALGO = "sha256";

export function signBody(body: string | Buffer): string {
	return createHmac(ALGO, env.CLOUD_TASKS_AUTH_SECRET)
		.update(body)
		.digest("hex");
}

export function verifyBody(body: string | Buffer, signature: string): boolean {
	const expected = signBody(body);
	try {
		return timingSafeEqual(
			Buffer.from(signature, "hex"),
			Buffer.from(expected, "hex"),
		);
	} catch {
		return false;
	}
}
