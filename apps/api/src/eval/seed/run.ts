import { initialize, logger } from "@atlas/logger";

initialize({ applicationEnvironment: "development" });

import { mastra } from "../../mastra/index.ts";
import { seedAbCompareDataset } from "./index.ts";

const log = logger.child({ component: "eval.seed.run" });

async function main(): Promise<void> {
	const result = await seedAbCompareDataset(mastra);
	log.info(result, "seed complete");
	console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
	log.error({ err }, "seed failed");
	process.exitCode = 1;
});
