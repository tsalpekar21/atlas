import { type SignUpDetails, signUpDetailsSchema } from "@atlas/schemas/auth";
import { Button } from "@atlas/subframe/components/Button";
import { LinkButton } from "@atlas/subframe/components/LinkButton";
import {
	FeatherArrowRight,
	FeatherCalendar,
	FeatherPhone,
	FeatherUser,
} from "@subframe/core";
import { Link } from "@tanstack/react-router";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { type FormEvent, useCallback, useState } from "react";
import { FormField } from "@/components/ui/forms/FormField";
import {
	maskDateOfBirth,
	maskUsPhoneNumber,
} from "@/components/ui/forms/masks";

const enhancedSchema = signUpDetailsSchema.extend({
	phoneNumber: signUpDetailsSchema.shape.phoneNumber.refine(
		(value) => parsePhoneNumberFromString(value, "US")?.isValid() ?? false,
		"Enter a valid phone number",
	),
});

type FieldErrors = Partial<Record<keyof SignUpDetails, string>>;

interface SignUpStepDetailsProps {
	defaultValues: SignUpDetails;
	onContinue: (values: SignUpDetails) => void;
}

export function SignUpStepDetails({
	defaultValues,
	onContinue,
}: SignUpStepDetailsProps) {
	const [values, setValues] = useState<SignUpDetails>(defaultValues);
	const [errors, setErrors] = useState<FieldErrors>({});

	const update = useCallback(
		<K extends keyof SignUpDetails>(field: K, next: SignUpDetails[K]) => {
			setValues((prev) => ({ ...prev, [field]: next }));
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		},
		[],
	);

	const onDateOfBirthChange = useCallback((raw: string) => {
		setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
		setValues((prev) => ({
			...prev,
			dateOfBirth: maskDateOfBirth(raw, prev.dateOfBirth),
		}));
	}, []);

	const onPhoneNumberChange = useCallback((raw: string) => {
		setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
		setValues((prev) => ({
			...prev,
			phoneNumber: maskUsPhoneNumber(raw, prev.phoneNumber),
		}));
	}, []);

	const onSubmit = useCallback(
		(event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const result = enhancedSchema.safeParse(values);
			if (!result.success) {
				const next: FieldErrors = {};
				for (const issue of result.error.issues) {
					const key = issue.path[0] as keyof SignUpDetails | undefined;
					if (key && !next[key]) {
						next[key] = issue.message;
					}
				}
				setErrors(next);
				return;
			}
			setErrors({});
			onContinue(result.data);
		},
		[values, onContinue],
	);

	return (
		<>
			<div className="flex w-full flex-col items-start gap-2">
				<span className="text-heading-1 font-heading-1 text-default-font mobile:text-heading-2 mobile:font-heading-2">
					Tell us about yourself
				</span>
				<span className="text-body font-body text-subtext-color">
					Let&rsquo;s start with some basics so we can personalize your
					experience.
				</span>
			</div>
			<form
				className="flex w-full flex-col items-start gap-5"
				onSubmit={onSubmit}
				noValidate
			>
				<div className="flex w-full items-start gap-4 mobile:flex-col mobile:flex-nowrap mobile:gap-4">
					<FormField
						className="h-auto grow shrink-0 basis-0"
						label="First name"
						icon={<FeatherUser />}
						placeholder="John"
						value={values.firstName}
						onChange={(v) => update("firstName", v)}
						error={errors.firstName}
						autoComplete="given-name"
					/>
					<FormField
						className="h-auto grow shrink-0 basis-0"
						label="Last name"
						icon={<FeatherUser />}
						placeholder="Doe"
						value={values.lastName}
						onChange={(v) => update("lastName", v)}
						error={errors.lastName}
						autoComplete="family-name"
					/>
				</div>
				<FormField
					className="h-auto w-full flex-none"
					label="Date of birth"
					icon={<FeatherCalendar />}
					placeholder="MM/DD/YYYY"
					value={values.dateOfBirth}
					onChange={onDateOfBirthChange}
					error={errors.dateOfBirth}
					autoComplete="bday"
					inputMode="numeric"
				/>
				<FormField
					className="h-auto w-full flex-none"
					label="Phone number"
					icon={<FeatherPhone />}
					type="tel"
					placeholder="(555) 000-0000"
					value={values.phoneNumber}
					onChange={onPhoneNumberChange}
					error={errors.phoneNumber}
					helpText="We'll use this for appointment reminders and verification"
					autoComplete="tel"
					inputMode="tel"
				/>
				<Button
					className="h-10 w-full flex-none"
					size="large"
					icon={<FeatherArrowRight />}
					iconRight={null}
					type="submit"
				>
					Continue
				</Button>
			</form>
			<div className="flex w-full items-center justify-center gap-1">
				<span className="text-body font-body text-subtext-color">
					Already have an account?
				</span>
				<Link to="/sign-in" className="no-underline">
					<LinkButton variant="brand">Sign in</LinkButton>
				</Link>
			</div>
		</>
	);
}
