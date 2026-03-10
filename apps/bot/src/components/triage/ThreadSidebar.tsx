"use client";

import { SidebarWithSections } from "@atlas/subframe/components/SidebarWithSections";
import { IconButton } from "@atlas/subframe/components/IconButton";
import {
  FeatherActivity,
  FeatherMessageSquare,
  FeatherPlus,
  FeatherTrash2,
} from "@subframe/core";

interface Thread {
  id: string;
  title?: string;
  createdAt: string;
}

interface ThreadSidebarProps {
  threads: Thread[];
  currentThreadId: string | undefined;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  isLoading?: boolean;
}

function formatThreadDate(date: string): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";
  return new Date(date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getThreadTitle(thread: Thread): string {
  return thread.title || `Triage ${formatThreadDate(thread.createdAt)}`;
}

export function ThreadSidebar({
  threads,
  currentThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  isLoading,
}: ThreadSidebarProps) {
  return (
    <SidebarWithSections
      header={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <FeatherActivity className="text-heading-3 font-heading-3 text-brand-700" />
            <span className="text-body-bold font-body-bold text-default-font">
              Triages
            </span>
          </div>
          <IconButton
            size="small"
            icon={<FeatherPlus />}
            onClick={onNewThread}
          />
        </div>
      }
    >
      <SidebarWithSections.NavSection label="Conversations">
        {isLoading ? (
          <div className="flex w-full items-center justify-center py-4">
            <span className="text-caption font-caption text-subtext-color">
              Loading...
            </span>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 py-4">
            <span className="text-caption font-caption text-subtext-color">
              No triages yet
            </span>
          </div>
        ) : (
          threads.map((thread) => (
            <SidebarWithSections.NavItem
              key={thread.id}
              icon={<FeatherMessageSquare />}
              selected={thread.id === currentThreadId}
              onClick={() => onSelectThread(thread.id)}
              rightSlot={
                <IconButton
                  size="small"
                  variant="destructive-tertiary"
                  icon={<FeatherTrash2 />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                />
              }
            >
              {getThreadTitle(thread)}
            </SidebarWithSections.NavItem>
          ))
        )}
      </SidebarWithSections.NavSection>
    </SidebarWithSections>
  );
}
