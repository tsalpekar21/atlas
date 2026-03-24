"use client";

import { Badge } from "@atlas/subframe/components/Badge";
import { Button } from "@atlas/subframe/components/Button";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { TextField } from "@atlas/subframe/components/TextField";
import {
  FeatherCopy,
  FeatherDatabase,
  FeatherLink,
  FeatherPlay,
  FeatherSearch,
  FeatherTarget,
} from "@subframe/core";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { queryCrawlRag } from "@/server/npi-functions.ts";

function scoreBadgeVariant(score: number): "success" | "warning" | "neutral" {
  const s = Math.min(1, Math.max(0, score));
  if (s >= 0.8) return "success";
  if (s >= 0.55) return "warning";
  return "neutral";
}

function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function RagChunkExplorerPage() {
  const [queryInput, setQueryInput] = useState("");
  const [topKInput, setTopKInput] = useState("5");
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  const ragMutation = useMutation({
    mutationFn: () => {
      const topK = Math.min(
        50,
        Math.max(1, Number.parseInt(topKInput, 10) || 5),
      );
      return queryCrawlRag({
        data: { query: queryInput.trim(), topK },
      });
    },
    onSuccess: (data) => {
      setLastQuery(data.query);
    },
  });

  const hits = ragMutation.data?.hits ?? [];
  const tookMs = ragMutation.data?.tookMs;

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(`${id}\n\n${text}`);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50">
      <div className="flex w-full flex-1 flex-col items-start gap-8 overflow-y-auto px-8 py-8 pb-12 mobile:px-4 mobile:py-6 max-w-[960px] m-auto">
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-100">
              <FeatherDatabase className="text-heading-3 font-heading-3 text-brand-700" />
            </div>
            <h1 className="text-heading-1 font-heading-1 text-default-font mobile:text-heading-2 mobile:font-heading-2">
              RAG Chunk Viewer
            </h1>
          </div>
          <p className="text-body font-body text-subtext-color">
            Query your vector database to see how content is chunked and scored
            for similarity. Uses crawl markdown chunks indexed from{" "}
            <span className="text-caption-bold font-caption-bold text-default-font">
              Crawled websites
            </span>
            .
          </p>
        </div>

        <div className="flex w-full flex-col items-start gap-6 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 shadow-sm mobile:px-4 mobile:py-4">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Test retrieval
          </span>
          <div className="flex w-full items-end gap-4 mobile:flex-col mobile:flex-nowrap mobile:items-stretch mobile:gap-4">
            <TextField
              className="h-auto min-w-0 grow"
              label="Search query"
              icon={<FeatherSearch />}
            >
              <TextField.Input
                placeholder="e.g. board-certified dermatology Mohs surgery"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !ragMutation.isPending) {
                    e.preventDefault();
                    ragMutation.mutate();
                  }
                }}
              />
            </TextField>
            <div className="flex items-end gap-4 mobile:w-full mobile:flex-col mobile:items-stretch">
              <TextField
                className="h-auto w-32 flex-none mobile:w-full"
                label="Top K"
              >
                <TextField.Input
                  placeholder="5"
                  inputMode="numeric"
                  value={topKInput}
                  onChange={(e) => setTopKInput(e.target.value)}
                />
              </TextField>
              <Button
                className="mobile:w-full"
                size="medium"
                icon={<FeatherPlay />}
                loading={ragMutation.isPending}
                disabled={!queryInput.trim()}
                onClick={() => ragMutation.mutate()}
              >
                Run query
              </Button>
            </div>
          </div>
          {ragMutation.isError ? (
            <div className="w-full rounded-md border border-error-200 bg-error-50 px-4 py-3 text-body font-body text-error-800">
              {ragMutation.error instanceof Error
                ? ragMutation.error.message
                : String(ragMutation.error)}
            </div>
          ) : null}
        </div>

        {lastQuery != null && ragMutation.data != null ? (
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full flex-col gap-2 border-b border-solid border-neutral-border pb-4 mobile:items-start">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-heading-3 font-heading-3 text-default-font">
                    Results for
                  </span>
                  <span className="max-w-full truncate text-heading-3 font-heading-3 text-brand-700">
                    &ldquo;{lastQuery}&rdquo;
                  </span>
                </div>
                <span className="text-body font-body text-subtext-color whitespace-nowrap">
                  Found {hits.length} chunk{hits.length === 1 ? "" : "s"}
                  {tookMs != null ? ` in ${tookMs}ms` : ""}
                </span>
              </div>
            </div>

            {hits.length === 0 ? (
              <p className="text-body font-body text-subtext-color">
                No chunks matched. Index crawls from{" "}
                <span className="font-medium text-default-font">
                  Crawled websites
                </span>{" "}
                first, or try a different query.
              </p>
            ) : (
              <div className="flex w-full flex-col items-start gap-4">
                {hits.map((hit) => (
                  <div
                    key={hit.id}
                    className="flex w-full flex-col items-start gap-4 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 shadow-sm mobile:px-4 mobile:py-4"
                  >
                    <div className="flex w-full flex-col items-start justify-between gap-3 mobile:flex-col">
                      <div className="flex w-full flex-wrap items-center gap-3">
                        <Badge
                          variant={scoreBadgeVariant(hit.score)}
                          icon={<FeatherTarget />}
                        >
                          {hit.score.toFixed(2)} score
                        </Badge>
                        <div className="flex min-w-0 items-center gap-1">
                          <FeatherLink className="h-3.5 w-3.5 shrink-0 text-caption font-caption text-subtext-color" />
                          <a
                            href={hit.sourceUrl || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 truncate text-caption font-caption text-subtext-color hover:underline"
                          >
                            {hit.sourceUrl || "—"}
                          </a>
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:justify-start">
                        <span className="text-caption font-caption text-neutral-400">
                          Chunk ID: {hit.id}
                        </span>
                        <IconButton
                          size="small"
                          icon={<FeatherCopy />}
                          onClick={() => handleCopy(hit.text, hit.id)}
                        />
                      </div>
                    </div>
                    <div className="flex w-full flex-col items-start rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-4">
                      <span className="whitespace-pre-wrap text-body font-body text-default-font">
                        {hit.text}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-caption font-caption text-subtext-color">
                        Tokens: ~{approxTokens(hit.text)}
                      </span>
                      <span className="text-caption font-caption text-neutral-300">
                        |
                      </span>
                      <span className="text-caption font-caption text-subtext-color">
                        Characters: {hit.text.length}
                      </span>
                      {hit.npi ? (
                        <>
                          <span className="text-caption font-caption text-neutral-300">
                            |
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            NPI {hit.npi}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
