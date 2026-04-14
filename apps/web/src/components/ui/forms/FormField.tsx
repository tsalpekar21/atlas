import { TextField } from "@atlas/subframe/components/TextField";
import type { ChangeEvent, ReactNode } from "react";

interface FormFieldProps {
	label: string;
	icon?: ReactNode;
	type?: "text" | "email" | "tel" | "password";
	placeholder?: string;
	value: string;
	onChange: (next: string) => void;
	error?: string;
	helpText?: string;
	className?: string;
	autoComplete?: string;
	inputMode?:
		| "text"
		| "email"
		| "tel"
		| "numeric"
		| "decimal"
		| "search"
		| "url";
}

export function FormField({
	label,
	icon,
	type = "text",
	placeholder,
	value,
	onChange,
	error,
	helpText,
	className,
	autoComplete,
	inputMode,
}: FormFieldProps) {
	return (
		<TextField
			className={className}
			label={label}
			icon={icon}
			helpText={error ?? helpText ?? ""}
			error={Boolean(error)}
		>
			<TextField.Input
				type={type}
				placeholder={placeholder}
				value={value}
				autoComplete={autoComplete}
				inputMode={inputMode}
				onChange={(event: ChangeEvent<HTMLInputElement>) =>
					onChange(event.target.value)
				}
			/>
		</TextField>
	);
}
