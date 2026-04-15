import { EventEmitter } from "node:events";
import type { Context, Next } from "hono";
import pinoHttp from "pino-http";
import { getLogger } from "./index.js";

function requestAttrs(req: unknown): {
  method?: string;
  path?: string;
  query?: Record<string, string>;
} {
  const r = req as {
    method?: string;
    url?: string;
    query?: Record<string, string>;
  };
  return {
    method: r.method,
    path: r.url,
    query: r.query,
  };
}

export function createPinoHttp() {
  return pinoHttp({
    logger: getLogger(),
    customAttributeKeys: {
      reqId: "requestId",
      responseTime: "durationMs",
    },
    customSuccessMessage: () => "request",
    customErrorMessage: () => "request",
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: () => undefined as unknown as object,
      res: () => undefined as unknown as object,
      err: () => undefined as unknown as object,
    },
    customSuccessObject: (req, res, val) => ({
      ...(val as object),
      ...requestAttrs(req),
      status: res.statusCode,
    }),
    customErrorObject: (req, res, _err, val) => ({
      ...(val as object),
      ...requestAttrs(req),
      status: res.statusCode,
    }),
  });
}

function makeResShim() {
  return Object.assign(new EventEmitter(), {
    statusCode: 200,
    getHeaders: () => ({}),
    getHeader: () => undefined,
    setHeader: () => {},
  });
}

export function honoHttpLogger() {
  const httpLogger = createPinoHttp();
  return async (c: Context, next: Next) => {
    const req = {
      method: c.req.method,
      url: c.req.path,
      headers: {},
      query: c.req.query(),
      id: c.var.requestId as string | undefined,
    } as unknown as Parameters<typeof httpLogger>[0];

    const resShim = makeResShim();
    const res = resShim as unknown as Parameters<typeof httpLogger>[1];

    httpLogger(req, res);
    try {
      await next();
    } finally {
      resShim.statusCode = c.res.status;
      resShim.emit("finish");
    }
  };
}

export function withFetchHttpLogger(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  const httpLogger = createPinoHttp();
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const req = {
      method: request.method,
      url: url.pathname,
      headers: {},
      query: Object.fromEntries(url.searchParams),
    } as unknown as Parameters<typeof httpLogger>[0];
    const resShim = makeResShim();
    const res = resShim as unknown as Parameters<typeof httpLogger>[1];
    httpLogger(req, res);
    try {
      const response = await handler(request);
      resShim.statusCode = response.status;
      resShim.emit("finish");
      return response;
    } catch (err) {
      resShim.statusCode = 500;
      resShim.emit("error", err);
      resShim.emit("finish");
      throw err;
    }
  };
}
