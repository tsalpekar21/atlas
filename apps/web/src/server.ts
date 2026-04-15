import "./bootstrap.server.ts";
import { logger, withFetchHttpLogger } from "@atlas/logger";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";

const baseHandler = createStartHandler(defaultStreamHandler);

const fetch = withFetchHttpLogger(async (request: Request) => {
	try {
		return await baseHandler(request);
	} catch (err) {
		logger.error(
			{
				err,
				method: request.method,
				path: new URL(request.url).pathname,
			},
			"unhandled exception",
		);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
});

export default {
	fetch,
};
