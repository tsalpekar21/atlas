"use client";

import { useChat } from "@ai-sdk/react";
import { Button } from "@atlas/subframe/components/Button";
import { IconButton } from "@atlas/subframe/components/IconButton";
import { TextArea } from "@atlas/subframe/components/TextArea";
import { FeatherArrowRight, FeatherStethoscope } from "@subframe/core";
import { Link, useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { ChatMessageLoadingIndicator } from "@/components/chat/ChatLoadingIndicator";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { toMessageText } from "@/components/chat/chat-utils";
import { env } from "@/env";

export function ChatHeader() {
	return (
		<div className="flex items-center gap-3 border-b border-solid border-neutral-border px-6 py-4 mobile:px-4">
			<Link to="/">
				<div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-600">
					<FeatherStethoscope className="text-heading-3 font-heading-3 text-white" />
				</div>
			</Link>
			<div className="flex flex-col items-start">
				<span className="text-heading-3 font-heading-3 text-default-font">
					Atlas Health
				</span>
			</div>
		</div>
	);
}

type ChatPageProps = {
	threadId: string;
	initialMessage?: string;
	sessionError: string | null;
	threadMessages: UIMessage[];
	threadMessagesError: string | null;
};

export function ChatPage({
	threadId,
	initialMessage,
	sessionError,
	threadMessages,
	threadMessagesError,
}: ChatPageProps) {
	const navigate = useNavigate({ from: "/chat/$threadId" });
	const [draft, setDraft] = useState("");
	const sentInitialRef = useRef(false);
	const scrollEndRef = useRef<HTMLDivElement>(null);
	const threadIdRef = useRef(threadId);
	threadIdRef.current = threadId;

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${env.VITE_API_URL}/chat`,
				credentials: "include",
				prepareSendMessagesRequest: ({
					body,
					messages,
					id,
					trigger,
					messageId,
				}) => ({
					body: {
						...body,
						id,
						messages,
						trigger,
						messageId,
						threadId: threadIdRef.current,
					},
				}),
			}),
		[],
	);

	const { messages, sendMessage, status, stop } = useChat({
		transport,
		messages: threadMessages,
		experimental_throttle: 50,
	});

	/** Route loader finished; block input only when session bootstrap failed. */
	const historyReady = sessionError === null;

	useEffect(() => {
		const initial = initialMessage?.trim();
		if (
			!initial ||
			sessionError ||
			threadMessages.length > 0 ||
			sentInitialRef.current
		) {
			return;
		}
		sentInitialRef.current = true;
		void navigate({
			search: (prev) => ({ ...prev, initialMessage: undefined }),
			replace: true,
		});
		void sendMessage({ text: initial });
	}, [initialMessage, navigate, sendMessage, sessionError, threadMessages]);

	const isBusy = status === "submitted" || status === "streaming";
	const lastMessage = messages[messages.length - 1];
	const awaitingContent =
		isBusy &&
		(!lastMessage ||
			lastMessage.role !== "assistant" ||
			toMessageText(lastMessage).trim() === "");

	const onSubmit = useCallback(() => {
		const text = draft.trim();
		if (!text || isBusy || !!sessionError || !historyReady) {
			return;
		}
		setDraft("");
		void sendMessage({ text });
	}, [draft, historyReady, isBusy, sendMessage, sessionError]);

	const onNewChat = useCallback(() => {
		void stop();
		const id = crypto.randomUUID();
		setDraft("");
		void navigate({
			to: "/chat/$threadId",
			params: { threadId: id },
			search: (prev) => ({
				...prev,
				initialMessage: undefined,
			}),
			replace: true,
		});
	}, [navigate, stop]);

	useLayoutEffect(() => {
		scrollEndRef.current?.scrollIntoView({ block: "end" });
	}, [messages, status]);

	return (
		<div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-default-background">
			<ChatHeader />

			<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [overflow-anchor:auto]">
				<div className="mx-auto flex min-h-full w-full max-w-[768px] flex-col px-6 py-6 mobile:px-4 mobile:py-4">
					<div className="flex-1" aria-hidden="true" />
					<div className="flex shrink-0 flex-col gap-4">
						{sessionError ? (
							<div className="rounded-lg border border-solid border-error-200 bg-error-50 px-4 py-3">
								<p className="text-body font-body text-error-700">
									{sessionError}
								</p>
							</div>
						) : null}

						{threadMessagesError ? (
							<div className="rounded-lg border border-solid border-error-200 bg-error-50 px-4 py-3">
								<p className="text-body font-body text-error-700">
									{threadMessagesError}
								</p>
							</div>
						) : null}

						<AnimatePresence mode="popLayout" initial={true}>
							{messages.map((message) => {
								if (message.role !== "user" && message.role !== "assistant") {
									return null;
								}
								const text = toMessageText(message);
								if (!text.trim()) {
									return null;
								}

								const isUser = message.role === "user";
								return (
									<motion.div
										key={message.id}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -4 }}
										transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
										className={`flex w-full min-w-0 ${isUser ? "justify-end" : "justify-start"}`}
									>
										<div
											className={`max-w-[85%] min-w-0 rounded-lg px-4 py-3 ${
												isUser
													? "bg-brand-100 text-default-font"
													: "text-default-font"
											}`}
										>
											<ChatMarkdown text={text} className="[&_*]:max-w-full" />
										</div>
									</motion.div>
								);
							})}
							<ChatMessageLoadingIndicator show={awaitingContent} />
						</AnimatePresence>
						<div
							ref={scrollEndRef}
							className="h-px w-full shrink-0 scroll-mb-2"
							aria-hidden="true"
						/>
					</div>
				</div>
			</div>

			<div className="border-t border-solid border-neutral-border px-6 py-4 mobile:px-4">
				<div className="mx-auto flex w-full max-w-[768px] flex-col gap-3">
					<div className="relative w-full">
						<TextArea className="w-full" label="" helpText="">
							<TextArea.Input
								aria-label="Type your message"
								className="box-border min-h-[108px] w-full resize-none px-3 py-3 pb-16 disabled:opacity-60"
								placeholder="Tell me what you're feeling..."
								value={draft}
								disabled={isBusy || !!sessionError || !historyReady}
								onChange={(e) => setDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										onSubmit();
									}
								}}
							/>
						</TextArea>
						<div className="pointer-events-none absolute bottom-6 right-6 z-10">
							<div className="pointer-events-auto">
								<IconButton
									variant="brand-primary"
									size="large"
									icon={<FeatherArrowRight />}
									disabled={
										!draft.trim() || isBusy || !!sessionError || !historyReady
									}
									loading={isBusy}
									onClick={onSubmit}
								/>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-caption font-caption text-subtext-color">
							For informational support only, not a medical diagnosis.
						</span>
						<div className="flex flex-wrap justify-end gap-2">
							<Button
								variant="neutral-secondary"
								size="small"
								disabled={!!sessionError}
								onClick={onNewChat}
							>
								New chat
							</Button>
							<Button
								variant="neutral-secondary"
								size="small"
								disabled={isBusy}
								onClick={() => {
									setDraft("");
								}}
							>
								Clear draft
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
