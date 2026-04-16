import { logger } from "@atlas/logger";
import type { Dataset } from "@mastra/core/datasets";
import type { Mastra } from "@mastra/core/mastra";
import { caseGoldSchema, caseInputSchema } from "../types.ts";
import { SEED_CASES } from "./cases.ts";

export const AB_COMPARE_DATASET_ID = "ab-compare-v1";

const log = logger.child({ component: "eval.seed" });

async function getOrCreateDataset(mastra: Mastra): Promise<Dataset> {
	try {
		return await mastra.datasets.get({ id: AB_COMPARE_DATASET_ID });
	} catch {
		log.info(
			{ datasetId: AB_COMPARE_DATASET_ID },
			"dataset not found — creating",
		);
		return mastra.datasets.create({
			name: AB_COMPARE_DATASET_ID,
			description:
				"A/B comparison cases for the research workflow vs research-disabled control. Each item pairs a chart snapshot + user message with gold annotations (red flags, must-cover points).",
			inputSchema: caseInputSchema,
			groundTruthSchema: caseGoldSchema,
			targetType: "workflow",
			targetIds: ["abCompare"],
		});
	}
}

export async function seedAbCompareDataset(
	mastra: Mastra,
): Promise<{ datasetId: string; addedCount: number; skippedCount: number }> {
	const dataset = await getOrCreateDataset(mastra);

	const existing = await dataset.listItems();
	const existingCaseIds = new Set<string>();
	const existingItems = Array.isArray(existing) ? existing : existing.items;
	for (const item of existingItems) {
		const parsed = caseInputSchema.safeParse(item.input);
		if (parsed.success) existingCaseIds.add(parsed.data.caseId);
	}

	let added = 0;
	let skipped = 0;
	for (const c of SEED_CASES) {
		if (existingCaseIds.has(c.input.caseId)) {
			skipped++;
			continue;
		}
		await dataset.addItem({
			input: c.input,
			groundTruth: c.groundTruth,
			source: { type: "json", referenceId: "apps/api/src/eval/seed/cases.ts" },
			metadata: {
				mode: c.input.mode,
				severity: c.input.severity,
			},
		});
		added++;
	}

	log.info(
		{ datasetId: AB_COMPARE_DATASET_ID, added, skipped },
		"ab-compare dataset seeded",
	);
	return {
		datasetId: AB_COMPARE_DATASET_ID,
		addedCount: added,
		skippedCount: skipped,
	};
}
