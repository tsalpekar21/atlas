import pino, { type Logger } from "pino";

export type ApplicationEnvironment = "development" | "production";

let instance: Logger | null = null;

/**
 * Initialize the shared logger. Call once at application startup.
 * Development: colored console via pino-pretty.
 * Production: newline-delimited JSON to stdout.
 */
export function initialize(options: {
  applicationEnvironment: ApplicationEnvironment;
}): Logger {
  const isDev = options.applicationEnvironment === "development";
  instance = isDev
    ? pino({
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
        level: "debug",
      })
    : pino({
        level: "info",
      });
  return instance;
}

/**
 * Get the shared logger. Must call initialize() first.
 */
export function getLogger(): Logger {
  if (!instance) {
    throw new Error(
      "@atlas/logger: initialize() must be called before getLogger()",
    );
  }
  return instance;
}

/**
 * Shared logger instance. Valid only after initialize() has been called.
 * Use getLogger() if you need to assert initialization first.
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_, prop) {
    return (getLogger() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type { Logger };
