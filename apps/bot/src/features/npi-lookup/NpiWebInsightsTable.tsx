"use client";

import type { NpiWebSearchHit } from "@atlas/schemas/npi";
import { Button } from "@atlas/subframe/components/Button";

type Props = {
  hits: NpiWebSearchHit[];
  crawlingUrl: string | null;
  enrichPending: boolean;
  verifiedUrl?: string;
  onCrawl: (hit: NpiWebSearchHit) => void;
};

export function NpiWebInsightsTable({
  hits,
  crawlingUrl,
  enrichPending,
  verifiedUrl,
  onCrawl,
}: Props) {
  const busy = enrichPending || Boolean(crawlingUrl);

  return (
    <div className="flex w-full flex-col gap-2">
      {hits.length > 0 && (
        <div className="w-full overflow-x-auto rounded-lg border border-solid border-neutral-border">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-solid border-neutral-border bg-neutral-50">
                <th className="px-4 py-3 text-caption-bold font-caption-bold text-subtext-color">
                  Title
                </th>
                <th className="px-4 py-3 text-caption-bold font-caption-bold text-subtext-color">
                  URL
                </th>
                <th className="max-w-[280px] px-4 py-3 text-caption-bold font-caption-bold text-subtext-color">
                  Description
                </th>
                <th className="w-36 px-4 py-3 text-caption-bold font-caption-bold text-subtext-color">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {hits.map((hit) => {
                const isVerified =
                  verifiedUrl != null &&
                  hit.url.replace(/\/$/, "") === verifiedUrl.replace(/\/$/, "");
                return (
                  <tr
                    key={hit.url}
                    className={
                      isVerified
                        ? "border-b border-solid border-neutral-border bg-success-50"
                        : "border-b border-solid border-neutral-border last:border-b-0"
                    }
                  >
                    <td className="px-4 py-3 align-top text-body-bold font-body-bold text-default-font">
                      {hit.title?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <a
                        href={hit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-caption font-caption text-brand-600 hover:underline"
                      >
                        {hit.url}
                      </a>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 align-top text-body font-body text-subtext-color">
                      <span className="line-clamp-3">
                        {hit.description ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Button
                        size="small"
                        variant={
                          isVerified ? "brand-secondary" : "brand-primary"
                        }
                        disabled={busy || isVerified}
                        onClick={() => onCrawl(hit)}
                      >
                        {isVerified ? "Crawled" : "Crawl site"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
