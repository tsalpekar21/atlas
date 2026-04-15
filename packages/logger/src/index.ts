import { AsyncLocalStorage } from "node:async_hooks";
import pino, { type Logger } from "pino";

export type ApplicationEnvironment = "development" | "production";

type RequestContext = { requestId: string };

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

let instance: Logger | null = null;

export function initialize(options: {
  applicationEnvironment: ApplicationEnvironment;
}): Logger {
  const isDev = options.applicationEnvironment === "development";

  instance = pino({
    level: isDev ? "debug" : "info",
    base: undefined,
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ level: label }),
    },
    mixin() {
      const ctx = requestContextStorage.getStore();
      return ctx ? { requestId: ctx.requestId } : {};
    },
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: false,
          ignore: "pid,hostname",
          messageKey: "msg",
        },
      },
    }),
  });

  return instance;
}

export function getLogger(): Logger {
  if (!instance) {
    throw new Error(
      "@atlas/logger: initialize() must be called before getLogger()",
    );
  }
  return instance;
}

export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => T,
): T {
  return requestContextStorage.run(ctx, fn);
}

export const logger: Logger = new Proxy({} as Logger, {
  get(_, prop) {
    return (getLogger() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export {
  honoHttpLogger,
  createPinoHttp,
  withFetchHttpLogger,
} from "./http.js";
export type { Logger };
