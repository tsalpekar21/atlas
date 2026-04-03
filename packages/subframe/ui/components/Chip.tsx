"use client";
/*
 * Documentation:
 * Chip — https://app.subframe.com/1a56b7bac267/library?component=Chip_d544c5d6-79ff-416f-a93e-0596535d9f23
 */

import React from "react";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../utils";

interface ChipRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const ChipRoot = React.forwardRef<HTMLDivElement, ChipRootProps>(
  function ChipRoot(
    { children, icon = null, className, ...otherProps }: ChipRootProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
          "flex h-7 items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5",
          className
        )}
        ref={ref}
        {...otherProps}
      >
        {icon ? (
          <SubframeCore.IconWrapper className="text-heading-3 font-heading-3 text-brand-600">
            {icon}
          </SubframeCore.IconWrapper>
        ) : null}
        {children ? (
          <span className="text-body font-body text-brand-600">{children}</span>
        ) : null}
      </div>
    );
  }
);

export const Chip = ChipRoot;
