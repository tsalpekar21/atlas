"use client";

import { ChatMessageBubble } from "@/components/triage/ChatMessageBubble";
import { NextStepsCard } from "@/components/triage/NextStepsCard";
import { ProviderTriageNote } from "@/components/triage/ProviderTriageNote";
import { QuestionOptions } from "@/components/triage/QuestionOptions";
import { ThreadSidebar } from "@/components/triage/ThreadSidebar";
import type { TriageMessage } from "@atlas/schemas/triage";
import {
  deleteThread,
  getThreadMessages,
  listThreads,
} from "@/server/thread-functions";
import { useChat } from "@ai-sdk/react";
import { Avatar } from "@atlas/subframe/components/Avatar";
import { Button } from "@atlas/subframe/components/Button";
import { IconWithBackground } from "@atlas/subframe/components/IconWithBackground";
import {
  FeatherActivity,
  FeatherCamera,
  FeatherCircle,
  FeatherSend,
} from "@subframe/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import React from "react";
import { z } from "zod";
import { ChatContentSkeleton } from "./-patient-triage-skeletons";

const RESOURCE_ID = "default-patient";

const searchSchema = z.object({
  threadId: z.string().default(crypto.randomUUID()),
});

export const Route = createFileRoute("/patient-triage-demo")({
  validateSearch: searchSchema,
  loader: async () => {
    try {
      const { threads } = await listThreads();
      return { threads };
    } catch (error) {
      return { threads: [] };
    }
  },
  component: PatientTriagePage,
});

function formatTime(date?: Date): string {
  return (date ?? new Date()).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function PatientTriagePage() {
  const { threadId } = Route.useSearch();
  const { threads } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const handleNewThread = React.useCallback(() => {
    const newId = crypto.randomUUID();
    navigate({ search: { threadId: newId } });
  }, [navigate]);

  const handleSelectThread = React.useCallback(
    (id: string) => {
      navigate({ search: { threadId: id } });
    },
    [navigate],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteThread({ data: { threadId: id } }),
    onSuccess: (_, deletedId) => {
      router.invalidate();
      if (threadId === deletedId) {
        navigate({ search: {} });
      }
    },
  });

  const handleThreadUpdate = React.useCallback(() => {
    router.invalidate();
  }, [queryClient]);

  return (
    <div className="flex h-screen w-full">
      <ThreadSidebar
        threads={threads ?? []}
        currentThreadId={threadId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteThread={(id) => deleteMutation.mutate(id)}
      />

      <ChatArea
        key={threadId}
        threadId={threadId}
        onThreadUpdate={handleThreadUpdate}
      />
    </div>
  );
}

function ChatArea({
  threadId,
  onThreadUpdate,
}: {
  threadId: string;
  onThreadUpdate: () => void;
}) {
  const messagesQuery = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => getThreadMessages({ data: { threadId } }),
  });

  return (
    <div className="flex grow shrink-0 basis-0 flex-col items-start bg-neutral-50 h-screen">
      {/* Header */}
      <div className="flex w-full flex-col items-start border-b border-solid border-neutral-border bg-default-background px-6 py-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <IconWithBackground
              variant="brand"
              size="large"
              icon={<FeatherActivity />}
              square={false}
            />
            <div className="flex flex-col items-start gap-1">
              <span className="text-heading-2 font-heading-2 text-default-font">
                SkinCare Dermatology
              </span>
              <span className="text-caption font-caption text-subtext-color">
                Patient Triage Assistant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-success-100 px-3 py-1">
            <FeatherCircle className="text-body font-body text-success-700" />
            <span className="text-caption-bold font-caption-bold text-success-700">
              AI Powered
            </span>
          </div>
        </div>
      </div>

      {!messagesQuery.isFetched ? (
        <ChatContentSkeleton />
      ) : (
        <ChatContent
          threadId={threadId}
          initialMessages={messagesQuery.data?.messages ?? []}
          onThreadUpdate={onThreadUpdate}
        />
      )}

      {/* Footer Disclaimer */}
      <div className="flex w-full flex-col items-start border-t border-solid border-neutral-border bg-default-background px-6 py-3">
        <span className="text-caption font-caption text-subtext-color">
          This triage is for informational purposes only and does not replace
          medical advice. For emergencies, call 911 or visit your nearest
          emergency room.
        </span>
      </div>
    </div>
  );
}

function ChatContent({
  threadId,
  initialMessages,
  onThreadUpdate,
}: {
  threadId: string;
  initialMessages: TriageMessage[];
  onThreadUpdate: () => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");

  const { messages, sendMessage, addToolOutput, status } =
    useChat<TriageMessage>({
      id: threadId,
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: {
          memory: {
            thread: threadId,
            resource: RESOURCE_ID,
          },
        },
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onFinish: onThreadUpdate,
    });

  const isLoading = status === "streaming" || status === "submitted";

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendText = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInputValue("");
  };

  const handleFileUpload = (files: FileList) => {
    sendMessage({
      text: "Here's a photo of the affected area.",
      files,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText(inputValue);
    }
  };

  return (
    <>
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-6 py-6 overflow-auto"
      >
        {messages.length === 0 ? (
          <EmptyState onExampleClick={handleSendText} />
        ) : (
          <>
            {messages.map((message, i) => (
              <MessageRenderer
                key={message.id}
                message={message}
                onOptionSelect={(toolCallId, text) => {
                  addToolOutput({
                    tool: "present_question",
                    toolCallId,
                    output: { selection: text },
                  });
                }}
                isLoading={isLoading}
                showTypingIndicator={isLoading && i === messages.length - 1}
              />
            ))}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex w-full items-center gap-3 border-t border-solid border-neutral-border bg-default-background px-6 py-3">
        <Button
          variant="neutral-tertiary"
          size="small"
          icon={<FeatherCamera />}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files);
            }
          }}
        />
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          disabled={isLoading}
          className="h-10 w-full flex-1 rounded-md border border-solid border-neutral-border bg-default-background px-3 text-body font-body text-default-font outline-none placeholder:text-neutral-400 focus:border-brand-600"
        />
        <Button
          variant="brand-primary"
          size="large"
          icon={<FeatherSend />}
          disabled={isLoading || !inputValue.trim()}
          onClick={() => handleSendText(inputValue)}
        >
          Send
        </Button>
      </div>
    </>
  );
}

const EXAMPLE_PROMPTS = [
  "I have a rash on my arm that's been spreading for a few days",
  "I noticed a new mole that looks irregular",
  "My skin has been very dry and itchy lately",
  "I have acne that isn't responding to over-the-counter treatments",
];

function EmptyState({
  onExampleClick,
}: {
  onExampleClick: (text: string) => void;
}) {
  return (
    <div className="flex w-full grow items-center justify-center">
      <div className="flex max-w-lg flex-col items-center gap-8 text-center">
        <IconWithBackground
          variant="brand"
          size="large"
          icon={<FeatherActivity />}
          square={false}
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-heading-2 font-heading-2 text-default-font">
            Welcome to SkinCare Dermatology
          </span>
          <span className="text-body font-body text-subtext-color">
            Our AI triage assistant will ask you a few questions about your skin
            concern to help determine the best care option for you.
          </span>
        </div>
        <div className="flex w-full flex-col items-start gap-2">
          <span className="text-caption-bold font-caption-bold text-subtext-color">
            Try an example
          </span>
          <div className="grid w-full grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onExampleClick(prompt)}
                className="rounded-lg border border-solid border-neutral-border bg-default-background px-4 py-3 text-left text-body font-body text-default-font transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-default-background px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]" />
      </div>
      <span className="text-caption font-caption text-subtext-color">
        Thinking...
      </span>
    </div>
  );
}

function MessageRenderer({
  message,
  onOptionSelect,
  isLoading,
  showTypingIndicator,
}: {
  message: TriageMessage;
  onOptionSelect: (toolCallId: string, text: string) => void;
  isLoading: boolean;
  showTypingIndicator: boolean;
}) {
  const timestamp = formatTime();

  if (message.role === "user") {
    return <UserMessage message={message} timestamp={timestamp} />;
  }

  const renderedParts = message.parts
    .map((part, index) => {
      if (part.type === "text" && part.text.trim()) {
        return (
          <div
            key={index}
            className="flex w-full max-w-[576px] flex-col items-start gap-1 rounded-lg bg-default-background px-4 py-3 shadow-sm"
          >
            <span className="text-body font-body text-default-font">
              {part.text}
            </span>
          </div>
        );
      }

      if (part.type === "tool-present_question") {
        if (part.state === "input-streaming") {
          return <div key={index}>Loading...</div>;
        }

        const hasOutput = part.state === "output-available";

        return (
          <React.Fragment key={index}>
            <QuestionOptions
              data={part.input}
              onSelect={(selection) =>
                onOptionSelect(part.toolCallId, selection)
              }
              disabled={isLoading || hasOutput}
            />
            {hasOutput && (
              <ChatMessageBubble role="user">
                {part.output.selection}
              </ChatMessageBubble>
            )}
          </React.Fragment>
        );
      }

      if (part.type === "tool-generate_triage_summary") {
        if (part.state === "input-streaming") {
          return <div>Loading...</div>;
        }

        return (
          <React.Fragment key={index}>
            <div className="flex w-full max-w-[576px] flex-col items-start gap-1 rounded-lg bg-success-50 px-4 py-3 shadow-sm">
              <span className="text-body-bold font-body-bold text-success-700">
                Triage Complete
              </span>
              <span className="text-body font-body text-default-font">
                I&apos;ve assessed your case and prepared a summary with
                recommended next steps.
              </span>
            </div>
            <ProviderTriageNote data={part.input} />
            <NextStepsCard data={part.input} />
          </React.Fragment>
        );
      }

      return null;
    })
    .filter(Boolean);

  const hasContent = renderedParts.length > 0;

  if (!hasContent && !showTypingIndicator) return null;

  return (
    <ChatMessageBubble
      role="assistant"
      timestamp={!showTypingIndicator ? timestamp : undefined}
    >
      {renderedParts}
      {showTypingIndicator && <TypingDots />}
    </ChatMessageBubble>
  );
}

function UserMessage({
  message,
  timestamp,
}: {
  message: TriageMessage;
  timestamp: string;
}) {
  const fileParts = message.parts.flatMap((p) =>
    p.type === "file" ? [p] : [],
  );
  const textContent = message.parts
    .flatMap((p) => (p.type === "text" ? [p.text] : []))
    .join(" ");

  if (fileParts.length > 0) {
    return (
      <div className="flex w-full items-start justify-end gap-3">
        <div className="flex flex-col items-end gap-2">
          <div className="flex max-w-[448px] flex-col items-start gap-2 rounded-lg bg-brand-600 px-2 py-2 shadow-sm">
            {fileParts.map((fp, i) => (
              <img
                key={i}
                className="h-48 w-full flex-none rounded-md object-cover"
                src={fp.url}
                alt="Uploaded photo"
              />
            ))}
            {textContent && (
              <span className="text-body font-body text-white px-2 pb-1">
                {textContent}
              </span>
            )}
          </div>
          <span className="text-caption font-caption text-subtext-color">
            {timestamp}
          </span>
        </div>
        <Avatar variant="neutral" size="small" image="">
          PT
        </Avatar>
      </div>
    );
  }

  return (
    <ChatMessageBubble role="user" timestamp={timestamp}>
      {textContent}
    </ChatMessageBubble>
  );
}

export default PatientTriagePage;
