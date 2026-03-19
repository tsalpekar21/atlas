"use client";

import type { NpiRegistryRecord } from "@atlas/schemas/npi";

function formatPrimitive(v: unknown): string {
	if (v === null || v === undefined) return "—";
	if (
		typeof v === "string" ||
		typeof v === "number" ||
		typeof v === "boolean"
	) {
		return String(v);
	}
	return JSON.stringify(v);
}

function TaxonomyBlock({
	title,
	data,
}: {
	title: string;
	data: Record<string, unknown>;
}) {
	const entries = Object.entries(data).filter(
		([, v]) => v !== undefined && v !== null && v !== "",
	);
	if (entries.length === 0) return null;
	return (
		<div className="flex flex-col gap-2">
			<span className="text-caption-bold font-caption-bold text-subtext-color">
				{title}
			</span>
			<dl className="flex flex-col gap-1 rounded-md border border-solid border-neutral-border bg-default-background px-3 py-3">
				{entries.map(([k, v]) => (
					<div
						key={k}
						className="grid grid-cols-1 gap-0.5 mobile:grid-cols-[minmax(0,140px)_1fr] sm:grid-cols-[180px_1fr]"
					>
						<dt className="text-caption font-caption text-subtext-color wrap-break-word">
							{k}
						</dt>
						<dd className="text-body font-body text-default-font wrap-break-word">
							{typeof v === "object" && v !== null ? (
								<pre className="max-h-32 overflow-auto whitespace-pre-wrap text-caption font-mono">
									{JSON.stringify(v, null, 2)}
								</pre>
							) : (
								formatPrimitive(v)
							)}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

type Props = {
	registry: NpiRegistryRecord;
};

function taxonomyStableKey(t: unknown, index: number): string {
	if (typeof t === "object" && t !== null) {
		const o = t as Record<string, unknown>;
		const parts = [o.code, o.state, o.license, o.primary, o.desc]
			.map((x) => (x == null ? "" : String(x)))
			.join("|");
		if (parts.replace(/\|/g, "") !== "") {
			return parts;
		}
	}
	return `taxonomy-${index}`;
}

const OMIT_FROM_ADDITIONAL = new Set([
	"addresses",
	"basic",
	"taxonomies",
	"identifiers",
	"other_names",
	"endpoints",
	"practiceLocations",
	"number",
	"enumeration_type",
	"created_epoch",
	"last_updated_epoch",
]);

export function NpiRegistryDetails({ registry }: Props) {
	const taxonomies = registry.taxonomies;
	const identifiers = registry.identifiers;
	const otherNames = registry.other_names;
	const endpoints = registry.endpoints;

	const restEntries = Object.entries(registry).filter(
		([k]) => !OMIT_FROM_ADDITIONAL.has(k),
	);

	return (
		<div className="flex w-full max-w-[768px] flex-col items-start gap-4">
			<span className="text-body-bold font-body-bold text-default-font">
				NPI registry (CMS)
			</span>
			<div className="flex flex-wrap gap-4 text-body font-body">
				<span>
					<span className="text-subtext-color">NPI: </span>
					{formatPrimitive(registry.number)}
				</span>
				<span>
					<span className="text-subtext-color">Type: </span>
					{formatPrimitive(registry.enumeration_type)}
				</span>
				{registry.created_epoch != null ? (
					<span>
						<span className="text-subtext-color">Created: </span>
						{formatPrimitive(registry.created_epoch)}
					</span>
				) : null}
				{registry.last_updated_epoch != null ? (
					<span>
						<span className="text-subtext-color">Updated: </span>
						{formatPrimitive(registry.last_updated_epoch)}
					</span>
				) : null}
			</div>

			{Array.isArray(taxonomies) && taxonomies.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					<span className="text-caption-bold font-caption-bold text-subtext-color">
						Taxonomies
					</span>
					<div className="flex flex-col gap-2">
						{taxonomies.map((t, i) => (
							<div
								key={taxonomyStableKey(t, i)}
								className="rounded-md border border-solid border-neutral-border bg-default-background px-3 py-2"
							>
								{typeof t === "object" && t !== null ? (
									<TaxonomyBlock
										title={`Taxonomy ${i + 1}`}
										data={t as Record<string, unknown>}
									/>
								) : (
									formatPrimitive(t)
								)}
							</div>
						))}
					</div>
				</div>
			) : null}

			{Array.isArray(identifiers) && identifiers.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					<span className="text-caption-bold font-caption-bold text-subtext-color">
						Identifiers
					</span>
					<pre className="max-h-48 w-full overflow-auto rounded-md border border-solid border-neutral-border bg-neutral-50 p-3 text-caption font-mono whitespace-pre-wrap">
						{JSON.stringify(identifiers, null, 2)}
					</pre>
				</div>
			) : null}

			{Array.isArray(otherNames) && otherNames.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					<span className="text-caption-bold font-caption-bold text-subtext-color">
						Other names
					</span>
					<pre className="max-h-40 w-full overflow-auto rounded-md border border-solid border-neutral-border bg-neutral-50 p-3 text-caption font-mono whitespace-pre-wrap">
						{JSON.stringify(otherNames, null, 2)}
					</pre>
				</div>
			) : null}

			{Array.isArray(endpoints) && endpoints.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					<span className="text-caption-bold font-caption-bold text-subtext-color">
						Endpoints
					</span>
					<pre className="max-h-40 w-full overflow-auto rounded-md border border-solid border-neutral-border bg-neutral-50 p-3 text-caption font-mono whitespace-pre-wrap">
						{JSON.stringify(endpoints, null, 2)}
					</pre>
				</div>
			) : null}

			{restEntries.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					<span className="text-caption-bold font-caption-bold text-subtext-color">
						Additional fields
					</span>
					<pre className="max-h-56 w-full overflow-auto rounded-md border border-solid border-neutral-border bg-neutral-50 p-3 text-caption font-mono whitespace-pre-wrap">
						{JSON.stringify(Object.fromEntries(restEntries), null, 2)}
					</pre>
				</div>
			) : null}
		</div>
	);
}
