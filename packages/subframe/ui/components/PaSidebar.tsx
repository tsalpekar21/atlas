"use client";
/*
 * Documentation:
 * PASidebar — https://app.subframe.com/1a56b7bac267/library?component=PASidebar_95892c2f-120a-473c-b5e1-46a8f60616b7
 */

import React from "react";
import { FeatherActivity } from "@subframe/core";
import * as SubframeCore from "@subframe/core";
import * as SubframeUtils from "../utils";

interface PaSidebarRootProps extends React.HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode;
  appName?: React.ReactNode;
  navigationItems?: React.ReactNode;
  className?: string;
}

const PaSidebarRoot = React.forwardRef<HTMLDivElement, PaSidebarRootProps>(
  function PaSidebarRoot(
    {
      logo = <FeatherActivity />,
      appName,
      navigationItems,
      className,
      ...otherProps
    }: PaSidebarRootProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
          "flex h-full w-64 flex-col items-start gap-6 border-r border-solid border-neutral-border bg-default-background px-6 py-6",
          className
        )}
        ref={ref}
        {...otherProps}
      >
        <div className="flex w-full items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-600">
            {logo ? (
              <SubframeCore.IconWrapper className="text-heading-3 font-heading-3 text-white">
                {logo}
              </SubframeCore.IconWrapper>
            ) : null}
          </div>
          {appName ? (
            <span className="text-heading-2 font-heading-2 text-default-font">
              {appName}
            </span>
          ) : null}
        </div>
        {navigationItems ? (
          <div className="flex w-full flex-col items-start gap-1">
            {navigationItems}
          </div>
        ) : null}
      </div>
    );
  }
);

export const PaSidebar = PaSidebarRoot;
