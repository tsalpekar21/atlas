import { FeatherStethoscope } from "@subframe/core";

interface BrandMarkProps {
	size?: "sm" | "md";
	tone?: "light" | "dark";
}

export function BrandMark({ size = "sm", tone = "dark" }: BrandMarkProps) {
	const iconBox = size === "md" ? "h-10 w-10" : "h-8 w-8";
	const iconSize =
		size === "md"
			? "text-heading-2 font-heading-2"
			: "text-body-bold font-body-bold";
	const wordmark =
		tone === "light"
			? "text-heading-3 font-heading-3 text-white"
			: "text-heading-3 font-heading-3 text-default-font";

	return (
		<div className="flex items-center gap-2">
			<div
				className={`${iconBox} flex flex-none items-center justify-center rounded-lg bg-brand-600`}
			>
				<FeatherStethoscope className={`${iconSize} text-white`} />
			</div>
			<span className={wordmark}>Atlas Health</span>
		</div>
	);
}
