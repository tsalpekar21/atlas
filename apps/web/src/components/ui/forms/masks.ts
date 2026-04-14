import { AsYouType } from "libphonenumber-js";

/**
 * Format a MM/DD/YYYY date of birth as the user types.
 *
 * Takes the raw input and the previous masked value so we can detect when
 * the user backspaced over a separator (a slash) — in that case we drop a
 * digit so backspace feels natural instead of being a no-op.
 */
export function maskDateOfBirth(raw: string, previous: string): string {
	const prevDigits = previous.replace(/\D/g, "");
	let digits = raw.replace(/\D/g, "").slice(0, 8);

	const deletedOneChar = previous.length - raw.length === 1;
	const onlyDeletedSeparator = deletedOneChar && digits === prevDigits;
	if (onlyDeletedSeparator) {
		digits = digits.slice(0, -1);
	}

	if (digits.length < 3) return digits;
	if (digits.length < 5) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
	return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Format a US phone number as the user types via libphonenumber-js's
 * AsYouType. Same backspace-over-separator handling as `maskDateOfBirth`.
 */
export function maskUsPhoneNumber(raw: string, previous: string): string {
	const prevDigits = previous.replace(/\D/g, "");
	let digits = raw.replace(/\D/g, "");

	const deletedOneChar = previous.length - raw.length === 1;
	const onlyDeletedSeparator = deletedOneChar && digits === prevDigits;
	if (onlyDeletedSeparator) {
		digits = digits.slice(0, -1);
	}

	if (digits.length === 0) return "";
	return new AsYouType("US").input(digits);
}
