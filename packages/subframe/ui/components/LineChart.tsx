"use client";
/*
 * Documentation:
 * Line Chart — https://app.subframe.com/1a56b7bac267/library?component=Line+Chart_22944dd2-3cdd-42fd-913a-1b11a3c1d16d
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../utils";

interface LineChartRootProps
  extends React.ComponentProps<typeof SubframeCore.LineChart> {
  className?: string;
}

const LineChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.LineChart>,
  LineChartRootProps
>(function LineChartRoot(
  { className, ...otherProps }: LineChartRootProps,
  ref
) {
  return (
    <SubframeCore.LineChart
      className={SubframeUtils.twClassNames("h-80 w-full", className)}
      ref={ref}
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

export const LineChart = LineChartRoot;
