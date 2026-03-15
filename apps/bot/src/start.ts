import { createStart, createMiddleware } from "@tanstack/react-start";
import { initialize, logger } from "@atlas/logger";

initialize({
  applicationEnvironment:
    process.env.NODE_ENV === "production" ? "production" : "development",
});

const requestLoggingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const start = Date.now();
    const method = request.method;
    const path = new URL(request.url).pathname;
    const result = await next();
    const durationMs = Date.now() - start;
    const statusCode =
      result && typeof result === "object" && "status" in result
        ? (result as unknown as Response).status
        : 200;
    logger.info({ method, path, statusCode, durationMs }, "request");
    return result;
  },
);

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [requestLoggingMiddleware],
  };
});
