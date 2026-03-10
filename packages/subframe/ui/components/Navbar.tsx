"use client";
/*
 * Documentation:
 * Navbar — https://app.subframe.com/1a56b7bac267/library?component=Navbar_a1e99969-595a-4b4c-a64f-c4a699a3f897
 */

import React from "react";
import * as SubframeUtils from "../utils";

interface NavbarRootProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const NavbarRoot = React.forwardRef<HTMLDivElement, NavbarRootProps>(
  function NavbarRoot(
    { title, description, action, className, ...otherProps }: NavbarRootProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
          "flex w-full items-center justify-between border-b border-solid border-neutral-border bg-default-background px-8 py-4",
          className
        )}
        ref={ref}
        {...otherProps}
      >
        <div className="flex items-center gap-4">
          {title ? (
            <span className="text-heading-2 font-heading-2 text-default-font">
              {title}
            </span>
          ) : null}
          <div className="flex h-6 w-px flex-none items-start bg-neutral-200" />
          {description ? (
            <span className="text-body font-body text-subtext-color">
              {description}
            </span>
          ) : null}
        </div>
        {action ? (
          <div className="flex items-center justify-between">{action}</div>
        ) : null}
      </div>
    );
  }
);

export const Navbar = NavbarRoot;
