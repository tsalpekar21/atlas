import type { HonoBindings, HonoVariables } from "@mastra/hono";

export type AppVariables = HonoVariables & { userId: string };
export type AppEnv = { Bindings: HonoBindings; Variables: AppVariables };
