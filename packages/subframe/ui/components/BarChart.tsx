"use client";
/*
 * Documentation:
 * Bar Chart — https://app.subframe.com/1a56b7bac267/library?component=Bar+Chart_4d4f30e7-1869-4980-8b96-617df3b37912
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../utils";

interface BarChartRootProps
  extends React.ComponentProps<typeof SubframeCore.BarChart> {
  stacked?: boolean;
  className?: string;
}

const BarChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.BarChart>,
  BarChartRootProps
>(function BarChartRoot(
  { stacked = false, className, ...otherProps }: BarChartRootProps,
  ref
) {
  return (
    <SubframeCore.BarChart
      className={SubframeUtils.twClassNames("h-80 w-full", className)}
      ref={ref}
      stacked={stacked}
      colors={[
        "#0ea5e9",
        "#bae6fd",
        "#0284c7",
        "#7dd3fc",
        "#0369a1",
        "#38bdf8",
      ]}
      {...otherProps}
    />
  );
});

export const BarChart = BarChartRoot;
