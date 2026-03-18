import type { Context } from "hono";
import { enrichDoctorsByNpis } from "../services/doctor-enrichment-pipeline.ts";

export async function postDoctorEnrichment(
  c: Context,
  npis: string[],
): Promise<Response> {
  const results = await enrichDoctorsByNpis(npis);
  return c.json({ results });
}
