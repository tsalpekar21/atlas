"use client";

import React from "react";
import { IconWithBackground } from "@atlas/subframe/components/IconWithBackground";
import {
  FeatherAlertCircle,
  FeatherAlertTriangle,
  FeatherCalendar,
  FeatherInfo,
  FeatherThermometer,
} from "@subframe/core";
import type { TriageSummaryInput } from "@/mastra/tools/triage-types";

const iconMap: Record<string, React.ReactNode> = {
  calendar: <FeatherCalendar />,
  alert: <FeatherAlertCircle />,
  thermometer: <FeatherThermometer />,
  info: <FeatherInfo />,
};

interface NextStepsCardProps {
  data: TriageSummaryInput | undefined;
}

export function NextStepsCard({ data }: NextStepsCardProps) {
  if (!data) return null;

  return (
    <div className="flex w-full max-w-[576px] flex-col items-start gap-4 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 shadow-md">
      <span className="text-heading-3 font-heading-3 text-default-font">
        Your next steps
      </span>
      <div className="flex w-full flex-col items-start gap-2">
        {data.nextSteps.map((step, i) => (
          <div
            key={i}
            className="flex w-full items-center gap-3 rounded-md border border-solid border-neutral-border bg-default-background px-4 py-3"
          >
            <IconWithBackground
              variant="brand"
              size="small"
              icon={iconMap[step.icon] ?? <FeatherInfo />}
            />
            <span className="text-body font-body text-default-font">
              {step.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex w-full items-center gap-2 rounded-md border border-solid border-error-300 bg-error-50 px-3 py-2">
        <FeatherAlertTriangle className="text-body font-body text-error-700" />
        <span className="text-body font-body text-error-700">
          {data.emergencyWarning}
        </span>
      </div>
    </div>
  );
}
