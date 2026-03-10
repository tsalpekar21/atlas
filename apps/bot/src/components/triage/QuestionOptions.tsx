"use client";

import React from "react";
import { Button } from "@atlas/subframe/components/Button";
import type { PresentQuestionInput } from "@/mastra/tools/triage-types";

interface QuestionOptionsProps {
  data: PresentQuestionInput | undefined;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuestionOptions({
  data,
  onSelect,
  disabled,
}: QuestionOptionsProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  if (!data) return null;

  if (data.selectionType === "single") {
    return (
      <div className="flex w-full max-w-[576px] flex-col items-start gap-3 rounded-lg bg-default-background px-4 py-3 shadow-sm">
        <span className="text-body font-body text-default-font">
          {data.question}
        </span>
        <div className="flex flex-wrap items-start gap-2">
          {data.options.map((option) => (
            <Button
              key={option}
              variant="neutral-secondary"
              size="small"
              disabled={disabled || submitted}
              onClick={() => {
                setSubmitted(true);
                onSelect(option);
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Multi-select: user picks multiple, then confirms
  return (
    <div className="flex w-full max-w-[576px] flex-col items-start gap-3 rounded-lg bg-default-background px-4 py-3 shadow-sm">
      <span className="text-body font-body text-default-font">
        {data.question}
      </span>
      <div className="flex flex-wrap items-start gap-2">
        {data.options.map((option) => (
          <Button
            key={option}
            variant={
              selected.has(option) ? "brand-primary" : "neutral-secondary"
            }
            size="small"
            disabled={disabled || submitted}
            onClick={() => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(option)) next.delete(option);
                else next.add(option);
                return next;
              });
            }}
          >
            {option}
          </Button>
        ))}
      </div>
      {selected.size > 0 && !submitted && (
        <Button
          variant="brand-primary"
          size="small"
          onClick={() => {
            setSubmitted(true);
            onSelect(Array.from(selected).join(", "));
          }}
        >
          Confirm Selection
        </Button>
      )}
    </div>
  );
}
