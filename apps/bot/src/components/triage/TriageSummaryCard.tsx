"use client";

import React from "react";
import { Badge } from "@atlas/subframe/components/Badge";
import { Button } from "@atlas/subframe/components/Button";
import { IconWithBackground } from "@atlas/subframe/components/IconWithBackground";
import {
  FeatherAlertCircle,
  FeatherAlertTriangle,
  FeatherCalendar,
  FeatherCheck,
  FeatherInfo,
  FeatherMessageSquare,
  FeatherThermometer,
} from "@subframe/core";
import type { TriageSummaryInput } from "@atlas/schemas/triage";

const iconMap: Record<string, React.ReactNode> = {
  calendar: <FeatherCalendar />,
  alert: <FeatherAlertCircle />,
  thermometer: <FeatherThermometer />,
  info: <FeatherInfo />,
};

const pathwayVariantMap: Record<
  string,
  {
    border: string;
    bg: string;
    textBold: string;
    text: string;
    icon: React.ReactNode;
  }
> = {
  "in-person": {
    border: "border-warning-300",
    bg: "bg-warning-50",
    textBold: "text-warning-700",
    text: "text-warning-600",
    icon: (
      <FeatherCalendar className="text-heading-3 font-heading-3 text-warning-700" />
    ),
  },
  telehealth: {
    border: "border-brand-300",
    bg: "bg-brand-50",
    textBold: "text-brand-700",
    text: "text-brand-600",
    icon: (
      <FeatherMessageSquare className="text-heading-3 font-heading-3 text-brand-700" />
    ),
  },
  "urgent-care": {
    border: "border-error-300",
    bg: "bg-error-50",
    textBold: "text-error-700",
    text: "text-error-600",
    icon: (
      <FeatherAlertCircle className="text-heading-3 font-heading-3 text-error-700" />
    ),
  },
  emergency: {
    border: "border-error-300",
    bg: "bg-error-50",
    textBold: "text-error-700",
    text: "text-error-600",
    icon: (
      <FeatherAlertTriangle className="text-heading-3 font-heading-3 text-error-700" />
    ),
  },
  "self-care": {
    border: "border-success-300",
    bg: "bg-success-50",
    textBold: "text-success-700",
    text: "text-success-600",
    icon: (
      <FeatherCheck className="text-heading-3 font-heading-3 text-success-700" />
    ),
  },
};

interface TriageSummaryCardProps {
  data: TriageSummaryInput | undefined;
}

export function TriageSummaryCard({ data }: TriageSummaryCardProps) {
  if (!data) return null;

  const pathway =
    pathwayVariantMap[data.recommendedPathway.type] ??
    pathwayVariantMap["in-person"];

  return (
    <div className="flex w-full flex-col items-start gap-6 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 shadow-md mt-2">
      {/* Title */}
      <div className="flex w-full items-center justify-between">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Triage Summary
        </span>
      </div>

      {/* Clinical Data */}
      <div className="flex w-full flex-col items-start gap-4">
        {/* Chief Complaint */}
        <div className="flex w-full flex-col items-start gap-3">
          <span className="text-body-bold font-body-bold text-default-font">
            Chief Complaint
          </span>
          <div className="flex w-full flex-col items-start gap-2 rounded-md border border-solid border-neutral-border bg-neutral-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <IconWithBackground
                variant="neutral"
                size="small"
                icon={<FeatherAlertCircle />}
              />
              <div className="flex flex-col items-start gap-1">
                <span className="text-caption font-caption text-subtext-color">
                  Primary Concern
                </span>
                <span className="text-body font-body text-default-font">
                  {data.chiefComplaint}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div className="flex w-full flex-col items-start gap-3">
          <span className="text-body-bold font-body-bold text-default-font">
            Clinical Details
          </span>
          <div className="flex w-full flex-col items-start gap-3">
            <div className="flex w-full items-start gap-4">
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-caption font-caption text-subtext-color">
                  Location
                </span>
                <span className="text-body font-body text-default-font">
                  {data.location}
                </span>
              </div>
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-caption font-caption text-subtext-color">
                  Duration
                </span>
                <span className="text-body font-body text-default-font">
                  {data.duration}
                </span>
              </div>
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-caption font-caption text-subtext-color">
                  Severity
                </span>
                <span className="text-body font-body text-default-font">
                  {data.severity}
                </span>
              </div>
            </div>

            {/* Symptoms */}
            <div className="flex w-full flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                Symptoms
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {data.symptoms.map((symptom) => (
                  <Badge key={symptom} variant="neutral" icon={null}>
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Treatments Tried */}
            <div className="flex w-full flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                Treatments Tried
              </span>
              <span className="text-body font-body text-default-font">
                {data.treatmentsTried}
              </span>
            </div>

            {/* Potential Trigger */}
            <div className="flex w-full flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                Potential Trigger
              </span>
              <span className="text-body font-body text-default-font">
                {data.potentialTrigger}
              </span>
            </div>
          </div>
        </div>

        {/* Uploaded Images */}
        {data.imageDescriptions.length > 0 && (
          <div className="flex w-full flex-col items-start gap-3">
            <span className="text-body-bold font-body-bold text-default-font">
              Uploaded Images
            </span>
            <div className="flex w-full flex-col items-start gap-2">
              {data.imageDescriptions.map((desc, i) => (
                <span
                  key={i}
                  className="text-caption font-caption text-subtext-color"
                >
                  {desc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex h-px w-full flex-none items-start bg-neutral-border" />

      {/* Recommended Care Pathway */}
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Recommended Care Pathway
        </span>
        <div
          className={`flex w-full items-center gap-2 rounded-md border border-solid ${pathway.border} ${pathway.bg} px-4 py-3`}
        >
          {pathway.icon}
          <div className="flex grow shrink-0 basis-0 flex-col items-start">
            <span
              className={`text-body-bold font-body-bold ${pathway.textBold}`}
            >
              {data.recommendedPathway.label}
            </span>
            <span className={`text-caption font-caption ${pathway.text}`}>
              {data.recommendedPathway.rationale}
            </span>
          </div>
        </div>

        {/* Rationale */}
        <div className="flex w-full flex-col items-start gap-3 rounded-md border border-solid border-neutral-border bg-neutral-50 px-4 py-4">
          <span className="text-body-bold font-body-bold text-default-font">
            Rationale:
          </span>
          <div className="flex w-full flex-col items-start gap-2">
            {data.rationalePoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <FeatherCheck className="text-body font-body text-default-font" />
                <span className="text-body font-body text-default-font">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex h-px w-full flex-none items-start bg-neutral-border" />

      {/* Next Steps */}
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Next Steps
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

        {/* Emergency Warning */}
        <div className="flex w-full items-center gap-2 rounded-md border border-solid border-error-300 bg-error-50 px-3 py-2">
          <FeatherAlertTriangle className="text-body font-body text-error-700" />
          <span className="text-body font-body text-error-700">
            {data.emergencyWarning}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex w-full items-center gap-3 pt-2">
        <Button
          className="h-10 grow shrink-0 basis-0"
          variant="brand-primary"
          size="large"
          icon={<FeatherCalendar />}
        >
          Schedule Appointment
        </Button>
        <Button
          className="h-10 grow shrink-0 basis-0"
          variant="neutral-secondary"
          size="large"
          icon={<FeatherMessageSquare />}
        >
          Contact Office
        </Button>
      </div>
    </div>
  );
}
