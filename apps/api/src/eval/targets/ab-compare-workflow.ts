import { randomUUID } from "node:crypto";
import { initialize, logger } from "@atlas/logger";
import type { Mastra } from "@mastra/core/mastra";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getLatestCompletedRound } from "../../services/research.ts";
import {
	type ArmOutcome,
	abCompareOutputSchema,
	caseInputSchema,
	type ResearchStats,
	researchStatsSchema,
	type Summary,
	summarySchema,
	type Turn,
} from "../types.ts";
import { HEALTH_ASSISTANT_EVAL_INSTRUCTIONS } from "./eval-instructions.ts";
import {
	GENERATE_SUMMARY_TOOL_NAME,
	generateSummaryTool,
} from "./generate-summary-tool.ts";
import { HEALTH_ASSISTANT_CONTROL_AGENT_ID } from "./health-assistant-control.ts";
import {
	buildSimulatorInstructions,
	PATIENT_SIMULATOR_AGENT_ID,
} from "./patient-simulator.ts";

initialize({ applicationEnvironment: "development" });

const log = logger.child({ component: "eval.ab-compare" });

const MAX_TURNS = 15;

const seededContextSchema = caseInputSchema.extend({
	controlThreadId: z.string(),
	treatmentThreadId: z.string(),
	controlUserId: z.string(),
	treatmentUserId: z.string(),
});

const armOutcomeStepSchema = z.object({
	threadId: z.string(),
	turns: z.array(
		z.object({
			role: z.enum(["patient", "agent"]),
			content: z.string(),
			toolCalls: z
				.array(z.object({ toolName: z.string(), args: z.unknown() }))
				.optional(),
		}),
	),
	summary: summarySchema.nullable(),
	turnsUsed: z.number().int().nonnegative(),
	reachedSummary: z.boolean(),
	ms: z.number(),
});

const treatmentStepSchema = z.object({
	arm: armOutcomeStepSchema,
	research: researchStatsSchema,
});

async function seedChart(args: {
	mastra: Mastra;
	agentId: string;
	threadId: string;
	userId: string;
	chart: string;
}): Promise<void> {
	const { mastra, agentId, threadId, userId, chart } = args;
	const agent = mastra.getAgent(agentId);
	const memory = await agent.getMemory();
	if (!memory) {
		throw new Error(`agent ${agentId} has no memory configured`);
	}
	const now = new Date();
	await memory.saveThread({
		thread: {
			id: threadId,
			resourceId: userId,
			createdAt: now,
			updatedAt: now,
			title: `eval:${threadId}`,
			metadata: { eval: true },
		},
	});
	await memory.updateWorkingMemory({
		threadId,
		resourceId: userId,
		workingMemory: chart,
	});
}

function extractSummaryFromToolCalls(result: unknown): Summary | null {
	const steps = (result as { steps?: unknown }).steps;
	if (!Array.isArray(steps)) return null;
	for (const step of steps) {
		const calls = (step as { toolCalls?: unknown[] }).toolCalls;
		if (!Array.isArray(calls)) continue;
		for (const c of calls) {
			const call = c as { toolName?: string; args?: unknown };
			if (call.toolName !== GENERATE_SUMMARY_TOOL_NAME) continue;
			const parsed = summarySchema.safeParse(call.args);
			if (parsed.success) return parsed.data;
			log.warn(
				{ err: parsed.error.issues },
				"generateSummary call received but args failed schema parse",
			);
			return null;
		}
	}
	return null;
}

function extractNonSummaryToolCalls(
	result: unknown,
): Array<{ toolName: string; args: unknown }> {
	const out: Array<{ toolName: string; args: unknown }> = [];
	const steps = (result as { steps?: unknown }).steps;
	if (!Array.isArray(steps)) return out;
	for (const step of steps) {
		const calls = (step as { toolCalls?: unknown[] }).toolCalls;
		if (!Array.isArray(calls)) continue;
		for (const c of calls) {
			const call = c as { toolName?: string; args?: unknown };
			if (!call.toolName || call.toolName === GENERATE_SUMMARY_TOOL_NAME) {
				continue;
			}
			out.push({ toolName: call.toolName, args: call.args });
		}
	}
	return out;
}

type ResearchTickResult = {
	status: "complete" | "skipped" | "failed" | "error";
	ms: number;
};

async function runResearchOnce(args: {
	mastra: Mastra;
	threadId: string;
	userId: string;
}): Promise<ResearchTickResult> {
	const start = Date.now();
	try {
		const workflow = args.mastra.getWorkflow("backgroundResearch");
		const run = await workflow.createRun();
		const result = await run.start({
			inputData: { threadId: args.threadId, userId: args.userId },
		});
		const status = (result as { result?: { status?: string } }).result?.status;
		if (status === "complete" || status === "skipped" || status === "failed") {
			return { status, ms: Date.now() - start };
		}
		return { status: "error", ms: Date.now() - start };
	} catch (err) {
		log.warn({ err, threadId: args.threadId }, "research run threw");
		return { status: "error", ms: Date.now() - start };
	}
}

function applyResearchTick(
	stats: ResearchStats,
	tick: ResearchTickResult,
): void {
	stats.totalInvocations += 1;
	stats.totalMs += tick.ms;
	if (tick.status === "complete") stats.completedRounds += 1;
	else if (tick.status === "skipped") stats.skippedRounds += 1;
	else stats.failedRounds += 1;
}

async function runConversation(args: {
	mastra: Mastra;
	agentId: string;
	threadId: string;
	userId: string;
	openingMessage: string;
	simulatorInstructions: string;
	caseId: string;
	arm: "control" | "treatment";
	onAfterAgentTurn?: () => Promise<void>;
}): Promise<ArmOutcome> {
	const {
		mastra,
		agentId,
		threadId,
		userId,
		openingMessage,
		simulatorInstructions,
		caseId,
		arm,
		onAfterAgentTurn,
	} = args;

	const started = Date.now();
	const turns: Turn[] = [{ role: "patient", content: openingMessage }];
	let summary: Summary | null = null;
	let reachedSummary = false;

	const agent = mastra.getAgent(agentId);
	const simulator = mastra.getAgent(PATIENT_SIMULATOR_AGENT_ID);

	let lastPatientUtterance = openingMessage;

	for (let t = 0; t < MAX_TURNS; t++) {
		const turnStart = Date.now();
		const agentResult = await agent.generate(lastPatientUtterance, {
			memory: { thread: threadId, resource: userId },
			clientTools: { [GENERATE_SUMMARY_TOOL_NAME]: generateSummaryTool },
			instructions: HEALTH_ASSISTANT_EVAL_INSTRUCTIONS,
		});

		const otherCalls = extractNonSummaryToolCalls(agentResult);
		const maybeSummary = extractSummaryFromToolCalls(agentResult);

		const agentTurn: Turn = {
			role: "agent",
			content: agentResult.text,
			toolCalls: otherCalls.length > 0 ? otherCalls : undefined,
		};
		turns.push(agentTurn);

		log.info(
			{
				caseId,
				arm,
				turn: t + 1,
				durationMs: Date.now() - turnStart,
				toolCalls: otherCalls.map((c) => c.toolName),
				reachedSummary: maybeSummary !== null,
			},
			"agent turn complete",
		);

		if (maybeSummary) {
			summary = maybeSummary;
			reachedSummary = true;
			break;
		}
		if (t === MAX_TURNS - 1) break;

		if (onAfterAgentTurn) {
			await onAfterAgentTurn();
		}

		const simResult = await simulator.generate(
			turns.map((turn) => ({
				role: turn.role === "patient" ? "assistant" : "user",
				content: turn.content,
			})),
			{ instructions: simulatorInstructions },
		);
		lastPatientUtterance = simResult.text;
		turns.push({ role: "patient", content: lastPatientUtterance });
	}

	return {
		threadId,
		turns,
		summary,
		turnsUsed: turns.filter((t) => t.role === "agent").length,
		reachedSummary,
		ms: Date.now() - started,
	};
}

const seedContextStep = createStep({
	id: "seed-context",
	inputSchema: caseInputSchema,
	outputSchema: seededContextSchema,
	execute: async ({ inputData, mastra }) => {
		const runSuffix = randomUUID().slice(0, 8);
		const controlThreadId = `eval-control-${inputData.caseId}-${runSuffix}`;
		const treatmentThreadId = `eval-treatment-${inputData.caseId}-${runSuffix}`;
		const controlUserId = `${inputData.userId}-control-${runSuffix}`;
		const treatmentUserId = `${inputData.userId}-treatment-${runSuffix}`;

		await Promise.all([
			seedChart({
				mastra,
				agentId: HEALTH_ASSISTANT_CONTROL_AGENT_ID,
				threadId: controlThreadId,
				userId: controlUserId,
				chart: inputData.chartMarkdown,
			}),
			seedChart({
				mastra,
				agentId: "healthAssistant",
				threadId: treatmentThreadId,
				userId: treatmentUserId,
				chart: inputData.chartMarkdown,
			}),
		]);

		log.info(
			{
				caseId: inputData.caseId,
				controlThreadId,
				treatmentThreadId,
				controlUserId,
				treatmentUserId,
			},
			"seeded chart for control and treatment threads",
		);
		return {
			...inputData,
			controlThreadId,
			treatmentThreadId,
			controlUserId,
			treatmentUserId,
		};
	},
});

const controlConversationStep = createStep({
	id: "control-conversation",
	inputSchema: seededContextSchema,
	outputSchema: armOutcomeStepSchema,
	execute: async ({ inputData, mastra }) => {
		return runConversation({
			mastra,
			agentId: HEALTH_ASSISTANT_CONTROL_AGENT_ID,
			threadId: inputData.controlThreadId,
			userId: inputData.controlUserId,
			openingMessage: inputData.openingMessage,
			simulatorInstructions: buildSimulatorInstructions(
				inputData.patientProfile,
			),
			caseId: inputData.caseId,
			arm: "control",
		});
	},
});

const treatmentConversationStep = createStep({
	id: "treatment-conversation",
	inputSchema: seededContextSchema,
	outputSchema: treatmentStepSchema,
	execute: async ({ inputData, mastra }) => {
		const stats: ResearchStats = {
			totalInvocations: 0,
			completedRounds: 0,
			skippedRounds: 0,
			failedRounds: 0,
			totalMs: 0,
			finalRoundId: null,
			finalFinding: null,
		};

		const initialTick = await runResearchOnce({
			mastra,
			threadId: inputData.treatmentThreadId,
			userId: inputData.treatmentUserId,
		});
		applyResearchTick(stats, initialTick);
		log.info(
			{
				caseId: inputData.caseId,
				phase: "initial",
				status: initialTick.status,
				ms: initialTick.ms,
			},
			"initial research tick",
		);

		const arm = await runConversation({
			mastra,
			agentId: "healthAssistant",
			threadId: inputData.treatmentThreadId,
			userId: inputData.treatmentUserId,
			openingMessage: inputData.openingMessage,
			simulatorInstructions: buildSimulatorInstructions(
				inputData.patientProfile,
			),
			caseId: inputData.caseId,
			arm: "treatment",
			onAfterAgentTurn: async () => {
				const tick = await runResearchOnce({
					mastra,
					threadId: inputData.treatmentThreadId,
					userId: inputData.treatmentUserId,
				});
				applyResearchTick(stats, tick);
				log.info(
					{
						caseId: inputData.caseId,
						phase: "per-turn",
						status: tick.status,
						ms: tick.ms,
						totalInvocations: stats.totalInvocations,
					},
					"per-turn research tick",
				);
			},
		});

		const finding = await getLatestCompletedRound(inputData.treatmentThreadId);
		stats.finalRoundId = finding?.id ?? null;
		stats.finalFinding = finding;

		return { arm, research: stats };
	},
});

const emitStep = createStep({
	id: "emit",
	inputSchema: z.object({
		"control-conversation": armOutcomeStepSchema,
		"treatment-conversation": treatmentStepSchema,
	}),
	outputSchema: abCompareOutputSchema,
	execute: async ({ inputData }) => {
		const control = inputData["control-conversation"];
		const treatment = inputData["treatment-conversation"];
		return {
			control,
			treatment: treatment.arm,
			research: treatment.research,
		};
	},
});

export const abCompareWorkflow = createWorkflow({
	id: "abCompare",
	inputSchema: caseInputSchema,
	outputSchema: abCompareOutputSchema,
})
	.then(seedContextStep)
	.parallel([controlConversationStep, treatmentConversationStep])
	.then(emitStep)
	.commit();
