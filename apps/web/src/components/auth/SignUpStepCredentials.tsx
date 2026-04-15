import {
	dateOfBirthToIsoDate,
	type SignUpCredentials,
	type SignUpDetails,
	signUpCredentialsSchema,
} from "@atlas/schemas/auth";
import { Button } from "@atlas/subframe/components/Button";
import { LinkButton } from "@atlas/subframe/components/LinkButton";
import {
	FeatherArrowLeft,
	FeatherArrowRight,
	FeatherLock,
	FeatherMail,
} from "@subframe/core";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useCallback, useState } from "react";
import { FormField } from "@/components/ui/forms/FormField";
import { authClient } from "@/lib/auth-client";
import { SESSION_QUERY_KEY } from "@/lib/session-query";

type FieldErrors = Partial<Record<keyof SignUpCredentials | "form", string>>;

interface SignUpStepCredentialsProps {
	details: SignUpDetails;
	onBack: () => void;
	onSuccess: () => void;
}

export function SignUpStepCredentials({
	details,
	onBack,
	onSuccess,
}: SignUpStepCredentialsProps) {
	const queryClient = useQueryClient();
	const [values, setValues] = useState<SignUpCredentials>({
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);

	const update = useCallback(
		<K extends keyof SignUpCredentials>(
			field: K,
			next: SignUpCredentials[K],
		) => {
			setValues((prev) => ({ ...prev, [field]: next }));
			setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
		},
		[],
	);

	const onSubmit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (submitting) return;

			const result = signUpCredentialsSchema.safeParse(values);
			if (!result.success) {
				const next: FieldErrors = {};
				for (const issue of result.error.issues) {
					const key = issue.path[0] as keyof SignUpCredentials | undefined;
					if (key && !next[key]) {
						next[key] = issue.message;
					}
				}
				setErrors(next);
				return;
			}

			setErrors({});
			setSubmitting(true);
			try {
				const birthdate = dateOfBirthToIsoDate(details.dateOfBirth);
				const signUpResult = await authClient.signUp.email({
					email: result.data.email,
					password: result.data.password,
					name: `${details.firstName} ${details.lastName}`.trim(),
					// Better Auth additionalFields — declared in apps/api/src/auth.ts.
					// Postgres `date` column is bound as a string by postgres-js,
					// so we must pass 'YYYY-MM-DD', not a JS Date.
					birthdate,
					phoneNumber: details.phoneNumber,
				} as Parameters<typeof authClient.signUp.email>[0]);

				if (signUpResult.error) {
					setErrors({
						form: signUpResult.error.message ?? "Could not create account",
					});
					return;
				}
				await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
				onSuccess();
			} catch (err) {
				setErrors({
					form: err instanceof Error ? err.message : "Could not create account",
				});
			} finally {
				setSubmitting(false);
			}
		},
		[values, details, onSuccess, submitting, queryClient],
	);

	return (
		<>
			<div className="flex w-full flex-col items-start gap-2">
				<span className="text-heading-1 font-heading-1 text-default-font">
					Create your account
				</span>
				<span className="text-body font-body text-subtext-color">
					Almost there — set up your login credentials.
				</span>
			</div>
			<form
				className="flex w-full flex-col items-start gap-5"
				onSubmit={(e) => {
					void onSubmit(e);
				}}
				noValidate
			>
				<FormField
					className="h-auto w-full flex-none"
					label="Email address"
					icon={<FeatherMail />}
					type="email"
					placeholder="you@example.com"
					value={values.email}
					onChange={(v) => update("email", v)}
					error={errors.email}
					autoComplete="email"
				/>
				<FormField
					className="h-auto w-full flex-none"
					label="Password"
					icon={<FeatherLock />}
					type="password"
					placeholder="Create a strong password"
					value={values.password}
					onChange={(v) => update("password", v)}
					error={errors.password}
					helpText="Must be at least 8 characters"
					autoComplete="new-password"
				/>
				<FormField
					className="h-auto w-full flex-none"
					label="Confirm password"
					icon={<FeatherLock />}
					type="password"
					placeholder="Re-enter your password"
					value={values.confirmPassword}
					onChange={(v) => update("confirmPassword", v)}
					error={errors.confirmPassword}
					autoComplete="new-password"
				/>
				{errors.form ? (
					<p className="text-caption font-caption text-error-700">
						{errors.form}
					</p>
				) : null}
				<div className="flex w-full items-center gap-3">
					<Button
						className="h-10 w-auto flex-none"
						variant="neutral-secondary"
						size="large"
						icon={<FeatherArrowLeft />}
						type="button"
						onClick={onBack}
						disabled={submitting}
					>
						Back
					</Button>
					<Button
						className="h-10 grow shrink-0 basis-0"
						size="large"
						icon={<FeatherArrowRight />}
						iconRight={null}
						type="submit"
						loading={submitting}
					>
						Create Account
					</Button>
				</div>
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
