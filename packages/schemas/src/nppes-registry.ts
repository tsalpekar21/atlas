import { z } from "zod";

/**
 * NPPES NPI Registry API v2.1 — JSON shapes.
 * @see https://npiregistry.cms.hhs.gov/api-page
 */

/** CMS often returns epoch as string or number. */
const nppesEpochSchema = z.union([z.string(), z.number()]);

export const nppesAddressSchema = z
  .object({
    country_code: z.string().optional().nullable(),
    country_name: z.string().optional().nullable(),
    address_purpose: z.string().optional().nullable(),
    address_type: z.string().optional().nullable(),
    address_1: z.string().optional().nullable(),
    address_2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    telephone_number: z.string().optional().nullable(),
    fax_number: z.string().optional().nullable(),
  })
  .passthrough();

export type NppesAddress = z.infer<typeof nppesAddressSchema>;

/** `basic` differs by NPI-1 (individual) vs NPI-2 (organization); all fields optional. */
export const nppesBasicSchema = z
  .object({
    prefix: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    middle_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    suffix: z.string().optional().nullable(),
    credential: z.string().optional().nullable(),
    sole_proprietor: z.string().optional().nullable(),
    sex: z.string().optional().nullable(),
    enumeration_date: z.string().optional().nullable(),
    last_updated: z.string().optional().nullable(),
    certification_date: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    organization_name: z.string().optional().nullable(),
    organizational_subpart: z.string().optional().nullable(),
    authorized_official_credential: z.string().optional().nullable(),
    authorized_official_first_name: z.string().optional().nullable(),
    authorized_official_last_name: z.string().optional().nullable(),
    authorized_official_middle_name: z.string().optional().nullable(),
    authorized_official_title_or_position: z.string().optional().nullable(),
    authorized_official_telephone_number: z.string().optional().nullable(),
    authorized_official_name_prefix: z.string().optional().nullable(),
    authorized_official_name_suffix: z.string().optional().nullable(),
    ein: z.string().optional().nullable(),
    replacement_npi: z.string().optional().nullable(),
    deactivation_reason_code: z.string().optional().nullable(),
    deactivation_date: z.string().optional().nullable(),
    reactivation_date: z.string().optional().nullable(),
  })
  .passthrough();

export type NppesBasic = z.infer<typeof nppesBasicSchema>;

export const nppesTaxonomySchema = z
  .object({
    code: z.string().optional().nullable(),
    taxonomy_group: z.string().nullable().optional().nullable(),
    desc: z.string().optional().nullable(),
    state: z.string().nullable().optional().nullable(),
    license: z.string().nullable().optional().nullable(),
    primary: z.boolean().optional().nullable(),
  })
  .passthrough();

export type NppesTaxonomy = z.infer<typeof nppesTaxonomySchema>;

export const nppesIdentifierSchema = z
  .object({
    code: z.string().optional().nullable(),
    desc: z.string().optional().nullable(),
    issuer: z.string().optional().nullable(),
    identifier: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
  })
  .passthrough();

export type NppesIdentifier = z.infer<typeof nppesIdentifierSchema>;

export const nppesEndpointSchema = z
  .object({
    endpoint: z.string().optional().nullable(),
    endpointType: z.string().optional().nullable(),
    affiliation: z.string().optional().nullable(),
    affiliationLegalBusinessName: z.string().optional().nullable(),
    use: z.string().optional().nullable(),
    contentType: z.string().optional().nullable(),
    content: z.unknown().optional().nullable(),
  })
  .passthrough();

export type NppesEndpoint = z.infer<typeof nppesEndpointSchema>;

export const nppesOtherNameSchema = z
  .object({
    organization_name: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    middle_name: z.string().optional().nullable(),
    prefix: z.string().optional().nullable(),
    suffix: z.string().optional().nullable(),
    credential: z.string().optional().nullable(),
  })
  .passthrough();

export type NppesOtherName = z.infer<typeof nppesOtherNameSchema>;

export const nppesPracticeLocationSchema = z
  .object({
    country_code: z.string().optional().nullable(),
    country_name: z.string().optional().nullable(),
    address_purpose: z.string().optional().nullable(),
    address_type: z.string().optional().nullable(),
    address_1: z.string().optional().nullable(),
    address_2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    telephone_number: z.string().optional().nullable(),
  })
  .passthrough();

export type NppesPracticeLocation = z.infer<typeof nppesPracticeLocationSchema>;

/** One provider in `results[]` (same object stored per-row as `registry` in our API). */
export const nppesProviderResultSchema = z
  .object({
    number: z.union([z.string(), z.number()]).transform((n) => String(n)),
    enumeration_type: z.string().optional().nullable(),
    created_epoch: nppesEpochSchema.optional().nullable(),
    last_updated_epoch: nppesEpochSchema.optional().nullable(),
    basic: nppesBasicSchema.optional().nullable(),
    addresses: z.array(nppesAddressSchema).optional().nullable(),
    taxonomies: z.array(nppesTaxonomySchema).optional().nullable(),
    identifiers: z.array(nppesIdentifierSchema).optional().nullable(),
    endpoints: z.array(nppesEndpointSchema).optional().nullable(),
    other_names: z.array(nppesOtherNameSchema).optional().nullable(),
    practiceLocations: z
      .array(nppesPracticeLocationSchema)
      .optional()
      .nullable(),
  })
  .passthrough();

export type NppesProviderResult = z.infer<typeof nppesProviderResultSchema>;

export const nppesRegistryErrorItemSchema = z
  .object({
    field: z.string().optional().nullable(),
    number: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })
  .passthrough();

export type NppesRegistryErrorItem = z.infer<
  typeof nppesRegistryErrorItemSchema
>;

/** Successful lookup: `result_count` + `results`. */
export const nppesRegistryApiSuccessSchema = z
  .object({
    result_count: z.coerce.number(),
    results: z.array(nppesProviderResultSchema),
  })
  .passthrough();

export type NppesRegistryApiSuccess = z.infer<
  typeof nppesRegistryApiSuccessSchema
>;

/** Validation / API error payload. */
export const nppesRegistryApiErrorSchema = z
  .object({
    Errors: z.array(nppesRegistryErrorItemSchema),
  })
  .passthrough();

export type NppesRegistryApiError = z.infer<typeof nppesRegistryApiErrorSchema>;

/** Full API JSON: success or Errors. */
export const nppesRegistryApiResponseSchema = z.union([
  nppesRegistryApiSuccessSchema,
  nppesRegistryApiErrorSchema,
]);

export type NppesRegistryApiResponse = z.infer<
  typeof nppesRegistryApiResponseSchema
>;

export function isNppesRegistryError(
  r: NppesRegistryApiResponse,
): r is NppesRegistryApiError {
  return "Errors" in r && Array.isArray(r.Errors) && r.Errors.length > 0;
}

/** Narrow success after `!isNppesRegistryError(r)`. */
export function assertNppesRegistrySuccess(
  r: NppesRegistryApiResponse,
): NppesRegistryApiSuccess {
  if (isNppesRegistryError(r)) {
    const msg = r.Errors.map((e) => e.description ?? JSON.stringify(e)).join(
      "; ",
    );
    throw new Error(msg || "NPPES API error");
  }
  return r;
}

/**
 * Parse raw NPPES JSON. Throws if body is not a recognized shape.
 * Callers should check HTTP status first.
 */
export function parseNppesRegistryResponse(
  json: unknown,
): NppesRegistryApiResponse {
  const withErrors = z.object({ Errors: z.array(z.unknown()) }).safeParse(json);
  if (
    withErrors.success &&
    Array.isArray(withErrors.data.Errors) &&
    withErrors.data.Errors.length > 0
  ) {
    return nppesRegistryApiErrorSchema.parse(json);
  }
  return nppesRegistryApiSuccessSchema.parse(json);
}
