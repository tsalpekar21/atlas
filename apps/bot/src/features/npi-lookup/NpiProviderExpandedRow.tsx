"use client";

import type { NpiProviderRow, NpiWebSearchResponse } from "@atlas/schemas/npi";
import { Badge } from "@atlas/subframe/components/Badge";
import { Button } from "@atlas/subframe/components/Button";
import { TextField } from "@atlas/subframe/components/TextField";
import {
  FeatherGlobe,
  FeatherLoader,
  FeatherSearch,
  FeatherX,
} from "@subframe/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchNpiWebSearch, triggerNpiEnrich } from "@/server/npi-functions";
import { NpiRegistryDetails } from "./NpiRegistryDetails.tsx";
import { NpiWebInsightsTable } from "./NpiWebInsightsTable.tsx";

type Props = {
  row: NpiProviderRow;
};

export function NpiProviderExpandedRow({ row }: Props) {
  const { enrichment, npi, registry, searchQuery: rowSearchQuery } = row;
  const qc = useQueryClient();
  const [editableSearchQuery, setEditableSearchQuery] = useState(
    rowSearchQuery ?? "",
  );
  const [searchData, setSearchData] = useState<NpiWebSearchResponse | null>(
    null,
  );
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditableSearchQuery(row.searchQuery ?? "");
  }, [row.npi, row.searchQuery]);

  const searchMutation = useMutation({
    mutationFn: (queryOverride: string | undefined) =>
      fetchNpiWebSearch({
        data: {
          npi,
          limit: 10,
          queryOverride: queryOverride?.trim() || undefined,
        },
      }),
    onSuccess: (data) => {
      setSearchData(data);
      setSearchMessage(
        data.web.length === 0
          ? data.searchQuery
            ? "No websites found for this query."
            : "Could not build a search query from registry data."
          : null,
      );
    },
    onError: (e: Error) => {
      setSearchData(null);
      setSearchMessage(e.message);
    },
  });

  const enrichMutation = useMutation({
    mutationFn: (input: {
      seedUrl: string;
      title?: string;
      description?: string;
    }) =>
      triggerNpiEnrich({
        data: {
          npi,
          seedUrl: input.seedUrl,
          title: input.title,
          description: input.description,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["npi-providers"] });
    },
  });

  const crawling =
    enrichment.dataStatus === "crawling"
      ? (enrichment.selectedUrl ?? null)
      : null;

  const verifiedUrl =
    enrichment.dataStatus === "verified" ? enrichment.selectedUrl : undefined;

  const showSummaryCard =
    enrichment.dataStatus === "verified" &&
    (enrichment.webTitle ||
      enrichment.webDescription ||
      enrichment.selectedUrl);

  return (
    <div className="flex w-full flex-col items-start gap-6 px-14 pt-2 pb-8">
      <div className="flex w-full max-w-[960px] flex-col items-start gap-6">
        <NpiRegistryDetails registry={registry} />

        <div className="flex w-full flex-col items-start gap-3">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <span className="text-body-bold font-body-bold text-default-font">
              Web Insights
            </span>
            <Button
              size="small"
              variant="neutral-secondary"
              icon={<FeatherSearch />}
              loading={searchMutation.isPending}
              onClick={() =>
                searchMutation.mutate(editableSearchQuery.trim() || undefined)
              }
            >
              Search for websites
            </Button>
          </div>
          <TextField
            className="w-full max-w-[640px]"
            label="Search query"
            helpText="Edit to change what Firecrawl searches for. Leave empty to use the default built from registry."
          >
            <TextField.Input
              placeholder="e.g. Dr. Jane Smith Cardiology Los Angeles medical practice website"
              value={editableSearchQuery}
              onChange={(e) => setEditableSearchQuery(e.target.value)}
            />
          </TextField>
          <span className="text-body font-body text-subtext-color">
            Firecrawl search finds candidate practice sites. Pick one to crawl
            and extract structured data.
          </span>
        </div>

        {searchMessage ? (
          <span className="text-body font-body text-warning-600">
            {searchMessage}
          </span>
        ) : null}

        {searchData && searchData.web.length > 0 ? (
          <NpiWebInsightsTable
            hits={searchData.web}
            crawlingUrl={crawling ?? null}
            enrichPending={enrichMutation.isPending}
            verifiedUrl={verifiedUrl}
            onCrawl={(hit) =>
              enrichMutation.mutate({
                seedUrl: hit.url,
                title: hit.title,
                description: hit.description,
              })
            }
          />
        ) : null}

        {showSummaryCard ? (
          <div className="flex w-full flex-col items-start gap-2 rounded-md border border-solid border-success-200 bg-success-50 px-4 py-4 shadow-sm">
            <span className="text-caption-bold font-caption-bold text-success-800">
              Last crawled site
            </span>
            {enrichment.selectedUrl ? (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white">
                  <FeatherGlobe className="text-caption font-caption text-subtext-color" />
                </div>
                <span className="text-caption font-caption text-subtext-color line-clamp-1">
                  {enrichment.selectedUrl}
                </span>
              </div>
            ) : null}
            {enrichment.webTitle ? (
              <span className="text-heading-3 font-heading-3 text-brand-700">
                {enrichment.webTitle}
              </span>
            ) : null}
            {enrichment.webDescription ? (
              <span className="line-clamp-3 text-body font-body text-subtext-color">
                {enrichment.webDescription}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex w-full items-center gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-4 py-4 shadow-sm mobile:flex-col mobile:flex-nowrap mobile:items-start mobile:justify-start mobile:gap-6">
          <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
            <span className="text-body-bold font-body-bold text-default-font">
              Automated Data Crawl
            </span>
            <span className="text-body font-body text-subtext-color">
              Status reflects the most recent crawl for this NPI. Use
              &quot;Crawl site&quot; on a search result to start a new crawl.
            </span>
          </div>
          <div className="flex flex-col items-end gap-3 mobile:h-auto mobile:w-full mobile:flex-none mobile:items-start mobile:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-caption font-caption text-subtext-color">
                Status:
              </span>
              {enrichment.dataStatus === "verified" ? (
                <Badge variant="success">Complete</Badge>
              ) : enrichment.dataStatus === "crawling" ? (
                <Badge variant="warning" icon={<FeatherLoader />}>
                  In progress
                  {enrichment.crawlTotal != null &&
                  enrichment.crawlTotal > 0 &&
                  enrichment.crawlCompleted != null
                    ? ` (${Math.round((enrichment.crawlCompleted / enrichment.crawlTotal) * 100)}%)`
                    : ""}
                </Badge>
              ) : (
                <Badge variant="neutral">Not crawled</Badge>
              )}
            </div>
            {enrichment.dataStatus === "crawling" ? (
              <span className="text-caption font-caption text-subtext-color">
                Refresh the list to see progress.
              </span>
            ) : null}
            {enrichment.dataStatus === "crawling" ? (
              <Button
                variant="destructive-secondary"
                size="small"
                icon={<FeatherX />}
                disabled
              >
                Stop crawl
              </Button>
            ) : null}
          </div>
        </div>
        {enrichMutation.isError ? (
          <span className="text-body font-body text-error-600">
            {(enrichMutation.error as Error).message}
          </span>
        ) : null}
        {enrichMutation.isSuccess &&
        enrichMutation.data?.results?.[0]?.error ? (
          <span className="text-body font-body text-error-600">
            {enrichMutation.data.results[0].error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
