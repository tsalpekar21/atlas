import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";

export function toMessageText(message: UIMessage): string {
	if (Array.isArray(message.parts)) {
		return message.parts
			.filter((p) => isTextUIPart(p))
			.map((p) => p.text)
			.join("");
	}
	return "";
}
