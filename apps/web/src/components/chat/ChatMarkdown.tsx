import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
	p: ({ children }) => (
		<p className="mb-2 text-body font-body text-inherit last:mb-0">
			{children}
		</p>
	),
	ul: ({ children }) => (
		<ul className="mb-2 list-disc pl-5 text-body font-body text-inherit last:mb-0">
			{children}
		</ul>
	),
	ol: ({ children }) => (
		<ol className="mb-2 list-decimal pl-5 text-body font-body text-inherit last:mb-0">
			{children}
		</ol>
	),
	li: ({ children }) => <li className="mb-0.5">{children}</li>,
	strong: ({ children }) => (
		<strong className="font-body-bold text-body-bold">{children}</strong>
	),
	em: ({ children }) => <em className="italic">{children}</em>,
	a: ({ children, href }) => (
		<a
			href={href}
			className="text-brand-600 underline decoration-brand-600/40 underline-offset-2 hover:text-brand-700"
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	),
	code: ({ className, children }) => {
		const isBlock = className?.includes("language-");
		if (isBlock) {
			return <code className={className}>{children}</code>;
		}
		return (
			<code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]">
				{children}
			</code>
		);
	},
	pre: ({ children }) => (
		<pre className="mb-2 overflow-x-auto rounded-md bg-neutral-100 px-3 py-2 text-caption font-mono text-default-font last:mb-0">
			{children}
		</pre>
	),
	h1: ({ children }) => (
		<h1 className="mb-2 text-heading-3 font-heading-3 text-inherit">
			{children}
		</h1>
	),
	h2: ({ children }) => (
		<h2 className="mb-2 text-heading-3 font-heading-3 text-inherit">
			{children}
		</h2>
	),
	h3: ({ children }) => (
		<h3 className="mb-1 text-body-bold font-body-bold text-inherit">
			{children}
		</h3>
	),
	blockquote: ({ children }) => (
		<blockquote className="mb-2 border-l-2 border-brand-400 pl-3 text-subtext-color last:mb-0">
			{children}
		</blockquote>
	),
	hr: () => <hr className="my-3 border-neutral-border" />,
	table: ({ children }) => (
		<div className="mb-2 max-w-full overflow-x-auto last:mb-0">
			<table className="w-full border-collapse text-left text-caption font-caption">
				{children}
			</table>
		</div>
	),
	thead: ({ children }) => (
		<thead className="border-b border-neutral-border">{children}</thead>
	),
	th: ({ children }) => (
		<th className="px-2 py-1.5 font-body-bold text-default-font">{children}</th>
	),
	td: ({ children }) => (
		<td className="border-t border-neutral-border px-2 py-1.5 text-default-font">
			{children}
		</td>
	),
};

type ChatMarkdownProps = {
	text: string;
	className?: string;
};

export function ChatMarkdown({ text, className }: ChatMarkdownProps) {
	return (
		<div className={className}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={markdownComponents}
			>
				{text}
			</ReactMarkdown>
		</div>
	);
}
