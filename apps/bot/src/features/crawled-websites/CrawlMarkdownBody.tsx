"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
	markdown: string;
	className?: string;
};

export function CrawlMarkdownBody({ markdown, className }: Props) {
	return (
		<div
			className={
				className ??
				"crawl-md max-w-none text-body font-body text-default-font [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_blockquote]:text-subtext-color [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-caption [&_code]:font-mono [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-heading-2 [&_h1]:font-heading-2 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-heading-3 [&_h2]:font-heading-3 [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-body-bold [&_h3]:font-body-bold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-neutral-100 [&_pre]:p-4 [&_pre]:text-caption [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-neutral-border [&_th]:bg-neutral-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-caption-bold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
			}
		>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
		</div>
	);
}
