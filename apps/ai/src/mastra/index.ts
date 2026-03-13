import { Mastra } from "@mastra/core/mastra";
import { SimpleAuth } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { triageAgent } from "./agents/triage-agent";
import { VercelDeployer } from "@mastra/deployer-vercel";
import { chatRoute } from "./routes/chat";
import {
  listThreadsRoute,
  getThreadMessagesRoute,
  deleteThreadRoute,
} from "./routes/threads";

const tokens: Record<string, { id: string; name: string }> = {};
const apiToken = process.env.MASTRA_API_TOKEN;
if (apiToken) {
  tokens[apiToken] = { id: "bot-app", name: "Atlas Bot" };
}

export const mastra = new Mastra({
  agents: { triageAgent },
  deployer: new VercelDeployer({
    studio: true,
    maxDuration: 10 * 60 * 1000, // 10 minutes
  }),
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.MASTRA_DATABASE_URL!,
  }),
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4111,
    ...(Object.keys(tokens).length > 0 && {
      auth: new SimpleAuth({ tokens }),
    }),
    apiRoutes: [
      chatRoute,
      listThreadsRoute,
      getThreadMessagesRoute,
      deleteThreadRoute,
    ],
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [new DefaultExporter(), new CloudExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
