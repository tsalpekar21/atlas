import { describe, expect, test } from "vitest";
import { applyFilter, parsePubmedArticle } from "./pubmed-search.ts";

/**
 * Unit tests for the pure helpers in `pubmed-search.ts`. Both
 * `applyFilter` and `parsePubmedArticle` are stateless and exported
 * specifically for this test suite — they don't touch the network.
 */

// ---------- applyFilter ----------

describe("applyFilter", () => {
	test("'all' returns the query unchanged", () => {
		expect(applyFilter("SIBO treatment", "all")).toBe("SIBO treatment");
	});

	test("'guidelines' appends practice-guideline clauses", () => {
		const out = applyFilter("SIBO treatment", "guidelines");
		expect(out).toContain("SIBO treatment");
		expect(out).toContain('"Practice Guideline"[ptyp]');
		expect(out).toContain('"Guideline"[ptyp]');
	});

	test("'reviews' appends systematic-review / meta-analysis clauses", () => {
		const out = applyFilter("bloating", "reviews");
		expect(out).toContain("bloating");
		expect(out).toContain('"Systematic Review"[ptyp]');
		expect(out).toContain('"Meta-Analysis"[ptyp]');
		expect(out).toContain('"Review"[ptyp]');
	});

	test("wraps the query in parens before appending the ptyp filter", () => {
		// "A OR B" must be parenthesized or PubMed boolean precedence
		// would break the filter's AND.
		const out = applyFilter("A OR B", "guidelines");
		expect(out).toMatch(/^\(A OR B\) AND \(/);
	});
});

// ---------- parsePubmedArticle ----------

/**
 * Minimal-but-realistic PubMedArticle node as `fast-xml-parser` would
 * emit it. Covers PMID, title, abstract (structured + single-paragraph),
 * authors (mixed with CollectiveName), journal, year, and publication
 * types.
 */
const canonicalArticle = {
	MedlineCitation: {
		PMID: "12345678",
		Article: {
			ArticleTitle: "Small intestinal bacterial overgrowth: a review",
			Abstract: {
				AbstractText: [
					{ "@_Label": "Background", "#text": "SIBO is common." },
					{ "@_Label": "Conclusions", "#text": "Treatment is multifaceted." },
				],
			},
			AuthorList: {
				Author: [
					{ LastName: "Smith", ForeName: "Jane" },
					{ LastName: "Doe", Initials: "J" },
					{ CollectiveName: "Functional Medicine Working Group" },
				],
			},
			Journal: {
				Title: "Gut",
				JournalIssue: { PubDate: { Year: "2023" } },
			},
			PublicationTypeList: {
				PublicationType: [{ "#text": "Review" }, { "#text": "Meta-Analysis" }],
			},
		},
	},
};

describe("parsePubmedArticle", () => {
	test("extracts PMID, title, and URL", () => {
		const out = parsePubmedArticle(canonicalArticle);
		expect(out).not.toBeNull();
		expect(out?.pmid).toBe("12345678");
		expect(out?.title).toBe("Small intestinal bacterial overgrowth: a review");
		expect(out?.url).toContain("12345678");
	});

	test("joins structured abstract sections with their labels", () => {
		const out = parsePubmedArticle(canonicalArticle);
		expect(out?.abstract).toContain("BACKGROUND: SIBO is common.");
		expect(out?.abstract).toContain("CONCLUSIONS: Treatment is multifaceted.");
	});

	test("extracts authors in 'ForeName LastName' form and handles CollectiveName", () => {
		const out = parsePubmedArticle(canonicalArticle);
		expect(out?.authors).toContain("Jane Smith");
		expect(out?.authors).toContain("J Doe");
		expect(out?.authors).toContain("Functional Medicine Working Group");
	});

	test("extracts journal + year + publicationTypes", () => {
		const out = parsePubmedArticle(canonicalArticle);
		expect(out?.journal).toBe("Gut");
		expect(out?.year).toBe(2023);
		expect(out?.publicationTypes).toEqual(["Review", "Meta-Analysis"]);
	});

	test("handles a single-paragraph abstract (non-array AbstractText)", () => {
		const node = {
			MedlineCitation: {
				PMID: "99",
				Article: {
					ArticleTitle: "t",
					Abstract: { AbstractText: "single paragraph body" },
					Journal: { Title: "J" },
				},
			},
		};
		const out = parsePubmedArticle(node);
		expect(out?.abstract).toBe("single paragraph body");
	});

	test("returns an article with `abstract: undefined` when Abstract is missing", () => {
		const node = {
			MedlineCitation: {
				PMID: "77",
				Article: { ArticleTitle: "t", Journal: { Title: "J" } },
			},
		};
		const out = parsePubmedArticle(node);
		expect(out).not.toBeNull();
		expect(out?.abstract).toBeUndefined();
	});

	test("returns null when PMID is missing", () => {
		const node = {
			MedlineCitation: { Article: { ArticleTitle: "no pmid" } },
		};
		expect(parsePubmedArticle(node)).toBeNull();
	});

	test("returns null when Article is missing", () => {
		const node = { MedlineCitation: { PMID: "1" } };
		expect(parsePubmedArticle(node)).toBeNull();
	});

	test("returns null on completely malformed input", () => {
		expect(parsePubmedArticle(null)).toBeNull();
		expect(parsePubmedArticle(undefined)).toBeNull();
		expect(parsePubmedArticle("a string")).toBeNull();
		expect(parsePubmedArticle({})).toBeNull();
	});

	test("falls back to MedlineDate for year when Year is missing", () => {
		const node = {
			MedlineCitation: {
				PMID: "1",
				Article: {
					ArticleTitle: "t",
					Journal: {
						Title: "J",
						JournalIssue: { PubDate: { MedlineDate: "2021 Jan-Feb" } },
					},
				},
			},
		};
		const out = parsePubmedArticle(node);
		expect(out?.year).toBe(2021);
	});
});
