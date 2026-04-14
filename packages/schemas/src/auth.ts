import { z } from "zod";

const MIN_DOB = new Date("1900-01-01");

function parseMmDdYyyy(value: string): Date | null {
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
	if (!match) return null;
	const [, mm, dd, yyyy] = match;
	const month = Number(mm);
	const day = Number(dd);
	const year = Number(yyyy);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}
	return date;
}

function isValidDateOfBirth(value: string): boolean {
	const date = parseMmDdYyyy(value);
	if (!date) return false;
	const now = new Date();
	return date >= MIN_DOB && date <= now;
}

/** Parses a validated MM/DD/YYYY string into a UTC Date. */
export function dateOfBirthToDate(value: string): Date {
	const date = parseMmDdYyyy(value);
	if (!date) {
		throw new Error(`Invalid date of birth: ${value}`);
	}
	return date;
}

/**
 * Formats a validated MM/DD/YYYY string as 'YYYY-MM-DD'. Use this when
 * writing to a Postgres `date` column (which is bound as a string by
 * postgres-js) — passing a JS Date instance will fail at bind time.
 */
export function dateOfBirthToIsoDate(value: string): string {
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
	if (!match) {
		throw new Error(`Invalid date of birth: ${value}`);
	}
	const [, mm, dd, yyyy] = match;
	return `${yyyy}-${mm}-${dd}`;
}

export const signUpDetailsSchema = z.object({
	firstName: z
		.string()
		.trim()
		.min(1, "First name is required")
		.max(80, "First name is too long"),
	lastName: z
		.string()
		.trim()
		.min(1, "Last name is required")
		.max(80, "Last name is too long"),
	dateOfBirth: z
		.string()
		.regex(/^\d{2}\/\d{2}\/\d{4}$/, "Use MM/DD/YYYY")
		.refine(isValidDateOfBirth, "Enter a valid date of birth"),
	phoneNumber: z.string().min(1, "Phone number is required"),
});

export type SignUpDetails = z.infer<typeof signUpDetailsSchema>;

export const signUpCredentialsSchema = z
	.object({
		email: z.string().trim().email("Enter a valid email"),
		password: z.string().min(8, "Must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match",
	});

export type SignUpCredentials = z.infer<typeof signUpCredentialsSchema>;

export const signInSchema = z.object({
	email: z.string().trim().email("Enter a valid email"),
	password: z.string().min(1, "Password is required"),
});

export type SignInValues = z.infer<typeof signInSchema>;
