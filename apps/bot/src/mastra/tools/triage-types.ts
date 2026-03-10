import type { Tool, UIMessage } from "ai";
import { z } from "zod";
import type {
  generateTriageSummaryTool,
  presentQuestionTool,
} from "./triage-tools";

// --- present_question tool ---

export const presentQuestionInputSchema = z.object({
  question: z.string().describe("The question text to present to the user"),
  options: z.array(z.string()).describe("Array of selectable option labels"),
  selectionType: z
    .enum(["single", "multi"])
    .describe("Whether the user can select one or multiple options"),
});

export type PresentQuestionInput = z.infer<typeof presentQuestionInputSchema>;

export const presentQuestionOutputSchema = z.object({
  presented: z.literal(true),
});

// --- generate_triage_summary tool ---

export const triageSummaryInputSchema = z.object({
  chiefComplaint: z.string().describe("Primary concern in a short phrase"),
  location: z.string().describe("Body location of the concern"),
  duration: z.string().describe("How long the issue has been present"),
  severity: z.string().describe('Severity rating, e.g. "6-7 out of 10"'),
  symptoms: z.array(z.string()).describe("List of symptom names"),
  treatmentsTried: z
    .string()
    .describe("Description of treatments already tried"),
  potentialTrigger: z
    .string()
    .describe("Potential trigger or cause if identified"),
  imageDescriptions: z
    .array(z.string())
    .describe("Descriptions of uploaded images, empty array if none"),
  recommendedPathway: z.object({
    type: z
      .enum([
        "in-person",
        "telehealth",
        "urgent-care",
        "emergency",
        "self-care",
      ])
      .describe("The recommended care pathway"),
    label: z
      .string()
      .describe(
        'Human-readable label, e.g. "In-Person Appointment Recommended"',
      ),
    rationale: z
      .string()
      .describe("Short explanation of why this pathway is recommended"),
  }),
  rationalePoints: z
    .array(z.string())
    .describe("Bulleted rationale points for the recommendation"),
  nextSteps: z.array(
    z.object({
      icon: z
        .enum(["calendar", "alert", "thermometer", "info"])
        .describe("Icon identifier"),
      text: z.string().describe("Action item text"),
    }),
  ),
  emergencyWarning: z
    .string()
    .describe("Warning text for emergency situations"),
});

export type TriageSummaryInput = z.infer<typeof triageSummaryInputSchema>;

export const triageSummaryOutputSchema = z.object({
  summaryGenerated: z.literal(true),
});

type InferToolUI<T> =
  // biome-ignore lint/suspicious/noExplicitAny: Tool generic has 7 type params; only TIn/TOut matter
  T extends Tool<infer TIn, infer TOut> ? { input: TIn; output: TOut } : never;

type TriageTools = {
  present_question: InferToolUI<typeof presentQuestionTool>;
  generate_triage_summary: InferToolUI<typeof generateTriageSummaryTool>;
};

export type TriageMessage = UIMessage<
  unknown,
  Record<string, unknown>,
  TriageTools
>;
