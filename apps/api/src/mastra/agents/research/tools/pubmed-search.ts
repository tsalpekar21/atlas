import { logger } from "@atlas/logger";
import { createTool } from "@mastra/core/tools";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { env } from "../../../../env.ts";

/**
 * PubMed search tool backing `guidelineResearcher` and `literatureResearcher`.
 *
 * Flow: two HTTP round trips to NCBI E-utilities —
 *   1. `esearch.fcgi` (JSON) → list of PMIDs matching the query
 *   2. `efetch.fcgi`  (XML)  → full records (title + abstract + authors + journal + year + pubtypes)
 *
 * Abstracts are only available via `efetch`, which for PubMed does not
 * support JSON — so we parse the XML with `fast-xml-parser`. The XML shape
 * is `<PubmedArticleSet><PubmedArticle><MedlineCitation>...` and is stable.
 *
 * With `NCBI_API_KEY` set the rate limit is 10 req/s; without it, 3 req/s.
 * Several workers may hit the tool concurrently in one round, so setting
 * the key in `apps/api/.env` is strongly recommended.
 *
 * Errors, parse failures, and empty results all yield `{ articles: [], total: 0 }`
 * instead of throwing — a worker agent can gracefully fall back to
 * LLM-only reasoning when PubMed is unreachable.
 */

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const PUBMED_ARTICLE_URL = "https://pubmed.ncbi.nlm.nih.gov";
const DEFAULT_TIMEOUT_MS = 8_000;

const toolLog = logger.child({ component: "pubmed.tool" });

const filterEnum = z.enum(["all", "guidelines", "reviews"]);

const articleSchema = z.object({
	pmid: z.string(),
	title: z.string(),
	abstract: z.string().optional(),
	authors: z.array(z.string()),
	journal: z.string().optional(),
	year: z.number().optional(),
	publicationTypes: z.array(z.string()),
	url: z.string(),
});

/**
 * Append a PubMed publication-type filter to the raw search term using
 * PubMed's native `[ptyp]` tag syntax. Keeping filter expansion local
 * (rather than asking the LLM to construct PubMed operators) means the
 * workers can pass plain clinical English and still get the right slice.
 */
function applyFilter(
	query: string,
	filter: z.infer<typeof filterEnum>,
): string {
	switch (filter) {
		case "guidelines":
			return `(${query}) AND ("Practice Guideline"[ptyp] OR "Guideline"[ptyp])`;
		case "reviews":
			return `(${query}) AND ("Systematic Review"[ptyp] OR "Meta-Analysis"[ptyp] OR "Review"[ptyp])`;
		case "all":
			return query;
	}
}

/**
 * Tiny fetch wrapper with an abort-controller timeout. We never want a
 * stalled PubMed request to block a research round — 8s is generous
 * compared to typical NCBI latency (~300-800ms) and keeps the parallel
 * workers bounded.
 */
async function fetchWithTimeout(
	url: string,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		return await fetch(url, { signal: ctrl.signal });
	} finally {
		clearTimeout(timer);
	}
}

function withApiKey(params: URLSearchParams): URLSearchParams {
	if (env.NCBI_API_KEY) params.set("api_key", env.NCBI_API_KEY);
	return params;
}

/**
 * Normalize anything that XML → JSON conversion might hand us for a
 * text-ish field. `fast-xml-parser` turns `<tag>value</tag>` into a
 * string, but `<tag attr="x">value</tag>` becomes an object with `#text`,
 * and missing tags are `undefined`. This coerces all three cases to a
 * plain string (or empty).
 */
function flatten(node: unknown): string {
	if (node == null) return "";
	if (typeof node === "string") return node;
	if (typeof node === "number" || typeof node === "boolean")
		return String(node);
	if (Array.isArray(node)) return node.map(flatten).join(" ").trim();
	if (typeof node === "object") {
		const obj = node as Record<string, unknown>;
		if (typeof obj["#text"] === "string") return obj["#text"];
		return flatten(Object.values(obj));
	}
	return "";
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
	if (v == null) return [];
	return Array.isArray(v) ? v : [v];
}

type EsearchResponse = {
	esearchresult?: {
		idlist?: string[];
		count?: string;
	};
};

async function esearch(
	query: string,
	maxResults: number,
): Promise<{ pmids: string[]; total: number }> {
	const params = withApiKey(
		new URLSearchParams({
			db: "pubmed",
			term: query,
			retmode: "json",
			retmax: String(maxResults),
			sort: "relevance",
		}),
	);
	const url = `${EUTILS_BASE}/esearch.fcgi?${params.toString()}`;
	const res = await fetchWithTimeout(url);
	if (!res.ok) {
		throw new Error(`esearch http ${res.status}`);
	}
	const json = (await res.json()) as EsearchResponse;
	return {
		pmids: json.esearchresult?.idlist ?? [],
		total: Number(json.esearchresult?.count ?? 0),
	};
}

type ParsedArticle = z.infer<typeof articleSchema>;

/**
 * Parse a single `<PubmedArticle>` node (already converted to JS by
 * fast-xml-parser) into our flat `ParsedArticle` shape. Robust to PubMed's
 * shape-shifting — structured abstracts have multiple `AbstractText`
 * children, single-paragraph abstracts have one string child, old records
 * have no abstract at all, single-author papers aren't wrapped in arrays.
 */
function parsePubmedArticle(node: unknown): ParsedArticle | null {
	if (!node || typeof node !== "object") return null;
	const article = node as Record<string, unknown>;
	const medline = article.MedlineCitation as
		| Record<string, unknown>
		| undefined;
	if (!medline) return null;

	const pmid = flatten(medline.PMID);
	if (!pmid) return null;

	const inner = medline.Article as Record<string, unknown> | undefined;
	if (!inner) return null;

	const title = flatten(inner.ArticleTitle);
	if (!title) return null;

	// Abstract: may be absent, a single AbstractText, or an array of
	// labeled sections (e.g. BACKGROUND / METHODS / RESULTS / CONCLUSIONS).
	let abstract: string | undefined;
	const absNode = inner.Abstract as Record<string, unknown> | undefined;
	if (absNode) {
		const parts = toArray(absNode.AbstractText);
		const joined = parts
			.map((p) => {
				if (p && typeof p === "object" && "@_Label" in p) {
					const obj = p as Record<string, unknown>;
					const label = String(obj["@_Label"] ?? "").trim();
					const body = flatten(obj);
					return label ? `${label.toUpperCase()}: ${body}` : body;
				}
				return flatten(p);
			})
			.filter(Boolean)
			.join("\n\n")
			.trim();
		if (joined) abstract = joined;
	}

	// Authors: optional. Not every record has an AuthorList.
	const authorList = inner.AuthorList as Record<string, unknown> | undefined;
	const authors: string[] = [];
	if (authorList) {
		for (const author of toArray(authorList.Author)) {
			if (!author || typeof author !== "object") continue;
			const a = author as Record<string, unknown>;
			const last = flatten(a.LastName);
			const fore = flatten(a.ForeName) || flatten(a.Initials);
			const collective = flatten(a.CollectiveName);
			if (last) {
				authors.push(fore ? `${fore} ${last}` : last);
			} else if (collective) {
				authors.push(collective);
			}
		}
	}

	// Journal + year.
	const journalNode = inner.Journal as Record<string, unknown> | undefined;
	const journal = flatten(journalNode?.Title) || undefined;
	const issue = journalNode?.JournalIssue as
		| Record<string, unknown>
		| undefined;
	const pubDate = issue?.PubDate as Record<string, unknown> | undefined;
	const yearRaw =
		flatten(pubDate?.Year) || flatten(pubDate?.MedlineDate).slice(0, 4);
	const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;

	// Publication types. Each PublicationType tag has a text body and a UI attr.
	const ptList = inner.PublicationTypeList as
		| Record<string, unknown>
		| undefined;
	const publicationTypes = ptList
		? toArray(ptList.PublicationType)
				.map((p) => flatten(p))
				.filter(Boolean)
		: [];

	return {
		pmid,
		title,
		abstract,
		authors,
		journal,
		year,
		publicationTypes,
		url: `${PUBMED_ARTICLE_URL}/${pmid}/`,
	};
}

async function efetch(pmids: string[]): Promise<ParsedArticle[]> {
	if (pmids.length === 0) return [];
	const params = withApiKey(
		new URLSearchParams({
			db: "pubmed",
			id: pmids.join(","),
			retmode: "xml",
			rettype: "abstract",
		}),
	);
	const url = `${EUTILS_BASE}/efetch.fcgi?${params.toString()}`;
	const res = await fetchWithTimeout(url);
	if (!res.ok) {
		throw new Error(`efetch http ${res.status}`);
	}
	const xml = await res.text();
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		// Force array shape for fields that can repeat; fast-xml-parser
		// otherwise collapses single-element lists to a scalar, which makes
		// downstream iteration error-prone.
		isArray: (name) =>
			["PubmedArticle", "Author", "AbstractText", "PublicationType"].includes(
				name,
			),
	});
	const parsed = parser.parse(xml) as {
		PubmedArticleSet?: { PubmedArticle?: unknown[] };
	};
	const raw = parsed.PubmedArticleSet?.PubmedArticle ?? [];
	const articles: ParsedArticle[] = [];
	for (const node of raw) {
		const a = parsePubmedArticle(node);
		if (a) articles.push(a);
	}
	// Preserve esearch ranking — efetch returns articles in the order we
	// requested them, so the esearch relevance order is preserved.
	return articles;
}

export const pubmedSearchTool = createTool({
	id: "pubmedSearch",
	description:
		"Search PubMed for peer-reviewed clinical evidence. Returns up to N " +
		"articles with title, abstract, authors, journal, year, and publication " +
		"types. Use precise clinical phrasing (MeSH-style is ideal). Set " +
		"filter='guidelines' to restrict to practice guidelines, 'reviews' for " +
		"systematic reviews and meta-analyses, or 'all' for any record. Only " +
		"cite PMIDs that appear in the tool response — do not fabricate.",
	inputSchema: z.object({
		query: z.string().min(3),
		maxResults: z.number().int().min(1).max(10).default(5),
		filter: filterEnum.default("all"),
	}),
	outputSchema: z.object({
		articles: z.array(articleSchema),
		total: z.number(),
	}),
	execute: async (input) => {
		const query = input.query;
		const maxResults = input.maxResults ?? 5;
		const filter = input.filter ?? "all";
		const startedAt = Date.now();
		const effectiveQuery = applyFilter(query, filter);

		try {
			const { pmids, total } = await esearch(effectiveQuery, maxResults);
			if (pmids.length === 0) {
				toolLog.info(
					{
						query,
						filter,
						durationMs: Date.now() - startedAt,
						total,
						returned: 0,
					},
					"pubmed: no results",
				);
				return { articles: [], total };
			}
			const articles = await efetch(pmids);
			toolLog.info(
				{
					query,
					filter,
					durationMs: Date.now() - startedAt,
					total,
					returned: articles.length,
				},
				"pubmed: success",
			);
			return { articles, total };
		} catch (err) {
			toolLog.warn(
				{
					query,
					filter,
					durationMs: Date.now() - startedAt,
					err,
				},
				"pubmed: failed — returning empty result",
			);
			return { articles: [], total: 0 };
		}
	},
});
