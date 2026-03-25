"use client";

import { useChat } from "@ai-sdk/react";
import type { TriageMessage } from "@atlas/schemas/triage";
import { Avatar } from "@atlas/subframe/components/Avatar";
import { Button } from "@atlas/subframe/components/Button";
import { IconWithBackground } from "@atlas/subframe/components/IconWithBackground";
import {
  FeatherActivity,
  FeatherCamera,
  FeatherCircle,
  FeatherSend,
} from "@subframe/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import React, { useCallback } from "react";
import { z } from "zod";
import { ChatMessageBubble } from "@/components/triage/ChatMessageBubble";
import { NextStepsCard } from "@/components/triage/NextStepsCard";
import { ProviderTriageNote } from "@/components/triage/ProviderTriageNote";
import { QuestionOptions } from "@/components/triage/QuestionOptions";
import { getThreadMessages } from "@/server/thread-functions";
import { ChatContentSkeleton } from "./-patient-triage-skeletons";

const RESOURCE_ID = "default-patient";

const searchSchema = z.object({
  threadId: z.string().default(crypto.randomUUID()),
});

export const Route = createFileRoute("/patient-triage-demo")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Patient triage · Atlas" }],
  }),
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
  const queryClient = useQueryClient();

  const handleThreadUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["threads"] });
  }, [queryClient]);

  return (
    <ChatArea
      key={threadId}
      threadId={threadId}
      onThreadUpdate={handleThreadUpdate}
    />
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
    queryFn: async () => {
      const messages = await getThreadMessages({ data: { threadId } });
      return messages as TriageMessage[];
    },
  });

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 shrink-0 basis-0 flex-col items-start bg-neutral-50">
      {/* Header */}
      <div className="flex w-full flex-col items-start border-b border-solid border-neutral-border bg-default-background px-4 py-4 md:px-6">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <IconWithBackground
              variant="brand"
              size="large"
              icon={<FeatherActivity />}
              square={false}
              className="shrink-0 max-sm:scale-90"
            />
            <div className="flex min-w-0 flex-col items-start gap-1">
              <span className="text-heading-3 font-heading-3 text-default-font md:text-heading-2 md:font-heading-2">
                SkinCare Dermatology
              </span>
              <span className="text-caption font-caption text-subtext-color">
                Patient Triage Assistant
              </span>
            </div>
          </div>
          <div className="hidden w-fit shrink-0 items-center gap-2 rounded-full bg-success-100 px-3 py-1 md:flex md:self-center">
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
          initialMessages={messagesQuery.data ?? []}
          onThreadUpdate={onThreadUpdate}
        />
      )}
    </div>
  );
}

function TriageDisclaimerFooter({ className }: { className?: string }) {
  return (
    <div
      className={[
        "flex w-full shrink-0 flex-col items-start border-t border-solid border-neutral-border bg-default-background px-4 py-2 md:px-6 md:py-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-caption font-caption text-subtext-color">
        This triage is for informational purposes only and does not replace
        medical advice. For emergencies, call 911 or visit your nearest
        emergency room.
      </span>
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col w-full">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="order-1 flex min-h-0 w-full min-w-0 flex-1 flex-col items-start gap-4 overflow-auto px-4 py-4 md:px-6 md:py-6"
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

      <TriageDisclaimerFooter className="order-2 md:order-3" />

      {/* Input Area — pinned to viewport bottom on mobile; md+ sits above disclaimer */}
      <div className="order-3 flex w-full min-w-0 shrink-0 items-center gap-2 border-t border-solid border-neutral-border bg-default-background px-4 py-3 max-md:fixed max-md:right-0 max-md:bottom-0 max-md:left-0 max-md:z-20 max-md:shadow-[0_-4px_12px_rgba(0,0,0,0.06)] max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:order-2 md:gap-3 md:px-6 md:shadow-none">
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
          className="h-10 w-full min-w-0 flex-1 rounded-md border border-solid border-neutral-border bg-default-background px-3 text-body font-body text-default-font outline-none placeholder:text-neutral-400 focus:border-brand-600"
        />
        <Button
          variant="brand-primary"
          size="large"
          icon={<FeatherSend />}
          disabled={isLoading || !inputValue.trim()}
          onClick={() => handleSendText(inputValue)}
          className="shrink-0"
        >
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
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
    <div className="flex w-full grow items-center justify-center px-1">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center sm:gap-8">
        <IconWithBackground
          variant="brand"
          size="large"
          icon={<FeatherActivity />}
          square={false}
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-heading-3 font-heading-3 text-default-font md:text-heading-2 md:font-heading-2">
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
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
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

  /** One UI row per bubble; tool-present_question uses assistant (input) then user (output). */
  type AssistantRow = {
    key: string;
    role: "assistant" | "user";
    children: React.ReactNode;
  };

  const rows: AssistantRow[] = [];

  for (let index = 0; index < message.parts.length; index++) {
    const part = message.parts[index];

    if (part.type === "text" && part.text.trim()) {
      rows.push({
        key: `${message.id}-text-${index}`,
        role: "assistant",
        children: (
          <div className="flex w-full max-w-[576px] flex-col items-start gap-1 rounded-lg bg-default-background px-4 py-3 shadow-sm">
            <span className="text-body font-body text-default-font">
              {part.text}
            </span>
          </div>
        ),
      });
      continue;
    }

    if (part.type === "tool-present_question") {
      if (part.state === "input-streaming") {
        rows.push({
          key: `${message.id}-pq-${index}`,
          role: "assistant",
          children: (
            <div className="text-caption font-caption text-subtext-color">
              Loading...
            </div>
          ),
        });
        continue;
      }

      const hasOutput = part.state === "output-available";

      rows.push({
        key: `${message.id}-pq-in-${part.toolCallId}`,
        role: "assistant",
        children: (
          <QuestionOptions
            data={part.input}
            onSelect={(selection) =>
              onOptionSelect(part.toolCallId, selection)
            }
            disabled={isLoading || hasOutput}
          />
        ),
      });

      if (hasOutput) {
        rows.push({
          key: `${message.id}-pq-out-${part.toolCallId}`,
          role: "user",
          children: part.output.selection,
        });
      }
      continue;
    }

    if (part.type === "tool-generate_triage_summary") {
      if (part.state === "input-streaming") {
        rows.push({
          key: `${message.id}-sum-${index}`,
          role: "assistant",
          children: (
            <div className="text-caption font-caption text-subtext-color">
              Loading...
            </div>
          ),
        });
        continue;
      }

      rows.push({
        key: `${message.id}-sum-${part.toolCallId}`,
        role: "assistant",
        children: (
          <>
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
          </>
        ),
      });
    }
  }

  if (showTypingIndicator) {
    rows.push({
      key: `${message.id}-typing`,
      role: "assistant",
      children: <TypingDots />,
    });
  }

  if (rows.length === 0) return null;

  const lastIndex = rows.length - 1;

  return (
    <>
      {rows.map((row, i) => (
        <ChatMessageBubble
          key={row.key}
          role={row.role}
          timestamp={
            i === lastIndex && !showTypingIndicator ? timestamp : undefined
          }
        >
          {row.children}
        </ChatMessageBubble>
      ))}
    </>
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
          <div className="flex max-w-full flex-col items-start gap-2 rounded-lg bg-brand-600 px-2 py-2 shadow-sm sm:max-w-[448px]">
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
