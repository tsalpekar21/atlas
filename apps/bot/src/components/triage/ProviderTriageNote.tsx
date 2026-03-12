"use client";

import React from "react";
import { Accordion } from "@atlas/subframe/components/Accordion";
import { TriageSummaryCard } from "@/components/triage/TriageSummaryCard";
import type { TriageSummaryInput } from "@atlas/schemas/triage";

interface ProviderTriageNoteProps {
  data: TriageSummaryInput | undefined;
}

export function ProviderTriageNote({ data }: ProviderTriageNoteProps) {
  if (!data) return null;

  return (
    <div className="flex w-full max-w-[576px] flex-col items-start">
      <Accordion
        defaultOpen={false}
        trigger={
          <div className="flex w-full items-center gap-2 rounded-md border border-solid border-neutral-border bg-neutral-50 px-4 py-3">
            <span className="text-caption font-caption text-subtext-color">
              Only visible to a provider
            </span>
            <Accordion.Chevron />
          </div>
        }
      >
        <TriageSummaryCard data={data} />
      </Accordion>
    </div>
  );
}
