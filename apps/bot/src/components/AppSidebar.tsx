"use client";

import { deleteThread, listThreads } from "@/server/thread-functions";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { SidebarWithSections } from "@atlas/subframe/components/SidebarWithSections";
import {
  FeatherActivity,
  FeatherMessageSquare,
  FeatherPlus,
  FeatherTrash2,
  FeatherUsers,
} from "@subframe/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Link,
  useMatchRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useCallback } from "react";

interface AppSidebarProps {
  children?: React.ReactNode;
  threadId?: string;
}

export function AppSidebar({ children, threadId }: AppSidebarProps) {
  const router = useRouter();
  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreads(),
  });
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  const handleNewThread = useCallback(() => {
    const newId = crypto.randomUUID();
    navigate({ to: "/patient-triage-demo", search: { threadId: newId } });
  }, [navigate]);

  const handleSelectThread = useCallback(
    (id: string) => {
      navigate({ to: "/patient-triage-demo", search: { threadId: id } });
    },
    [navigate],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteThread({ data: { threadId: id } }),
    onSuccess: (_, deletedId) => {
      router.invalidate();
      if (threadId === deletedId) {
        navigate({ to: "/patient-triage-demo", search: {} });
      }
    },
  });
  const isTriage = matchRoute({ to: "/patient-triage-demo" });
  const isNpiLookup = matchRoute({ to: "/npi-physician-lookup" });

  return (
    <SidebarWithSections
      header={
        <Link
          to="/patient-triage-demo"
          className="flex items-center gap-2 focus:outline-none"
        >
          <FeatherActivity className="text-heading-3 font-heading-3 text-brand-700" />
          <span className="text-body-bold font-body-bold text-default-font">
            Atlas
          </span>
        </Link>
      }
    >
      <SidebarWithSections.NavSection label="Triage">
        <Link to="/patient-triage-demo" className="w-full">
          <SidebarWithSections.NavItem
            icon={<FeatherActivity />}
            selected={!!isTriage}
          >
            Patient Triage
          </SidebarWithSections.NavItem>
        </Link>
        <Link to="/npi-physician-lookup" className="w-full">
          <SidebarWithSections.NavItem
            icon={<FeatherUsers />}
            selected={!!isNpiLookup}
          >
            NPI Lookup
          </SidebarWithSections.NavItem>
        </Link>
      </SidebarWithSections.NavSection>
      <SidebarWithSections.NavSection
        label={
          <div className="flex w-full items-center justify-between">
            <span>Conversations</span>
            <IconButton
              size="small"
              icon={<FeatherPlus />}
              onClick={handleNewThread}
            />
          </div>
        }
      >
        {threadsQuery.isLoading ? (
          <div className="flex w-full flex-col items-center gap-2 py-4">
            <span className="text-caption font-caption text-subtext-color">
              Loading...
            </span>
          </div>
        ) : threadsQuery.data?.threads.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 py-4">
            <span className="text-caption font-caption text-subtext-color">
              No triages yet
            </span>
          </div>
        ) : (
          threadsQuery.data?.threads.map((thread) => (
            <SidebarWithSections.NavItem
              key={thread.id}
              icon={<FeatherMessageSquare />}
              selected={thread.id === threadId}
              onClick={() => handleSelectThread(thread.id)}
              rightSlot={
                <IconButton
                  size="small"
                  variant="destructive-tertiary"
                  icon={<FeatherTrash2 />}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(thread.id);
                  }}
                />
              }
            >
              {thread.title ||
                `Triage ${new Date(thread.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}`}
            </SidebarWithSections.NavItem>
          ))
        )}
      </SidebarWithSections.NavSection>

      {children}
    </SidebarWithSections>
  );
}
