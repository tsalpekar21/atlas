"use client";

import React from "react";
import { Avatar } from "@atlas/subframe/components/Avatar";

interface ChatMessageBubbleProps {
  role: "assistant" | "user";
  children: React.ReactNode;
  timestamp?: string;
}

export function ChatMessageBubble({
  role,
  children,
  timestamp,
}: ChatMessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex w-full items-start justify-end gap-3">
        <div className="flex flex-col items-end gap-2">
          <div className="flex max-w-[448px] flex-col items-start gap-1 rounded-lg bg-brand-600 px-4 py-3 shadow-sm">
            <span className="text-body font-body text-white">{children}</span>
          </div>
          {timestamp && (
            <span className="text-caption font-caption text-subtext-color">
              {timestamp}
            </span>
          )}
        </div>
        <Avatar variant="neutral" size="small" image="">
          PT
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-3">
      <Avatar variant="brand" size="small" image="">
        AI
      </Avatar>
      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
        {children}
        {timestamp && (
          <span className="text-caption font-caption text-subtext-color">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
