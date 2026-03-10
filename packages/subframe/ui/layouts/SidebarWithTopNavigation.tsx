"use client";
/*
 * Documentation:
 * PASidebar — https://app.subframe.com/1a56b7bac267/library?component=PASidebar_95892c2f-120a-473c-b5e1-46a8f60616b7
 * Sidebar with top navigation — https://app.subframe.com/1a56b7bac267/library?component=Sidebar+with+top+navigation_9fa870fc-55b2-45d3-9a6a-8ba1863e9f73
 */

import React from "react";
import { FeatherActivity } from "@subframe/core";
import { FeatherBarChart } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherHome } from "@subframe/core";
import { FeatherSettings } from "@subframe/core";
import { FeatherUsers } from "@subframe/core";
import { PaSidebar } from "../components/PaSidebar";
import * as SubframeUtils from "../utils";

interface SidebarWithTopNavigationRootProps
  extends React.HTMLAttributes<HTMLDivElement> {
  childrenNonEditable?: React.ReactNode;
  className?: string;
}

const SidebarWithTopNavigationRoot = React.forwardRef<
  HTMLDivElement,
  SidebarWithTopNavigationRootProps
>(function SidebarWithTopNavigationRoot(
  {
    childrenNonEditable,
    className,
    ...otherProps
  }: SidebarWithTopNavigationRootProps,
  ref
) {
  return (
    <div
      className={SubframeUtils.twClassNames(
        "flex h-screen w-full flex-col items-start justify-between",
        className
      )}
      ref={ref}
      {...otherProps}
    >
      <div className="flex w-full grow shrink-0 basis-0 items-start justify-between">
        <PaSidebar
          logo={<FeatherActivity />}
          appName="Atlas Health"
          navigationItems={
            <>
              <div className="flex w-full items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-neutral-100">
                <FeatherHome className="text-body font-body text-subtext-color" />
                <span className="text-body font-body text-subtext-color">
                  Dashboard
                </span>
              </div>
              <div className="flex w-full items-center gap-3 rounded-md bg-brand-50 px-3 py-2 cursor-pointer">
                <FeatherFileText className="text-body font-body text-brand-700" />
                <span className="text-body-bold font-body-bold text-brand-700">
                  Prior Authorizations
                </span>
              </div>
              <div className="flex w-full items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-neutral-100">
                <FeatherUsers className="text-body font-body text-subtext-color" />
                <span className="text-body font-body text-subtext-color">
                  Patients
                </span>
              </div>
              <div className="flex w-full items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-neutral-100">
                <FeatherBarChart className="text-body font-body text-subtext-color" />
                <span className="text-body font-body text-subtext-color">
                  Analytics
                </span>
              </div>
              <div className="flex w-full items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-neutral-100">
                <FeatherSettings className="text-body font-body text-subtext-color" />
                <span className="text-body font-body text-subtext-color">
                  Settings
                </span>
              </div>
            </>
          }
        />
        <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
          {childrenNonEditable ? (
            <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-6 overflow-y-auto bg-neutral-50">
              {childrenNonEditable}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export const SidebarWithTopNavigation = SidebarWithTopNavigationRoot;
