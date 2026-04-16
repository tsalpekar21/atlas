import { initialize, logger } from "@atlas/logger";

initialize({ applicationEnvironment: "development" });

import { mastra } from "../../mastra/index.ts";
import { abCompareScorers } from "../scorers/index.ts";
import { AB_COMPARE_DATASET_ID, seedAbCompareDataset } from "../seed/index.ts";

const log = logger.child({ component: "eval.experiment.run" });

async function main(): Promise<void> {
	await seedAbCompareDataset(mastra);
	const dataset = await mastra.datasets.get({ id: AB_COMPARE_DATASET_ID });

	const name = process.env.EVAL_RUN_LABEL ?? `cli-${new Date().toISOString()}`;
	const maxConcurrency = Number.parseInt(
		process.env.EVAL_MAX_CONCURRENCY ?? "2",
		10,
	);

	log.info(
		{
			datasetId: AB_COMPARE_DATASET_ID,
			name,
			maxConcurrency,
			scorers: abCompareScorers.map((s) => s.id),
		},
		"starting experiment",
	);

	const summary = await dataset.startExperiment({
		targetType: "workflow",
		targetId: "abCompare",
		scorers: abCompareScorers,
		maxConcurrency,
		name,
	});

	console.log(
		JSON.stringify(
			{
				experimentId: summary.experimentId,
				status: summary.status,
				totalItems: summary.totalItems,
				succeededCount: summary.succeededCount,
				failedCount: summary.failedCount,
				completedWithErrors: summary.completedWithErrors,
			},
			null,
			2,
		),
	);
}

main().catch((err) => {
	log.error({ err }, "experiment failed");
	process.exitCode = 1;
});
