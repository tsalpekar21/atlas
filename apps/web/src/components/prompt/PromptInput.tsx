"use client";

import { IconButton } from "@atlas/subframe/components/IconButton";
import { TextArea } from "@atlas/subframe/components/TextArea";
import { FeatherArrowRight } from "@subframe/core";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";

const useIsoLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type PromptInputProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder: string;
	ariaLabel: string;
	disabled?: boolean;
	submitDisabled?: boolean;
	isLoading?: boolean;
	minHeight?: number;
	maxHeight?: number;
};

export function PromptInput({
	value,
	onChange,
	onSubmit,
	placeholder,
	ariaLabel,
	disabled = false,
	submitDisabled = false,
	isLoading = false,
	minHeight = 128,
	maxHeight = 400,
}: PromptInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useIsoLayoutEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		const next = Math.min(el.scrollHeight, maxHeight);
		el.style.height = `${next}px`;
		el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
	}, [value, minHeight, maxHeight]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
				e.preventDefault();
				onSubmit();
			}
		},
		[onSubmit],
	);

	return (
		<div className="relative w-full">
			<TextArea className="w-full" label="" helpText="">
				<TextArea.Input
					ref={textareaRef}
					aria-label={ariaLabel}
					className="box-border w-full resize-none px-5 py-6 pb-20 min-h-[var(--prompt-min-h)] disabled:opacity-60 mobile:px-4 mobile:py-4 mobile:pb-16 mobile:min-h-[96px]"
					style={{ "--prompt-min-h": `${minHeight}px` } as CSSProperties}
					placeholder={placeholder}
					value={value}
					disabled={disabled}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
			</TextArea>
			<div className="pointer-events-none absolute bottom-3 right-3">
				<div className="pointer-events-auto">
					<IconButton
						className="transition-transform motion-safe:hover:scale-105 motion-safe:active:scale-95"
						variant="brand-primary"
						size="large"
						icon={<FeatherArrowRight />}
						disabled={disabled || submitDisabled || isLoading}
						loading={isLoading}
						onClick={onSubmit}
					/>
				</div>
			</div>
		</div>
	);
}
