import { type SignInValues, signInSchema } from "@atlas/schemas/auth";
import { Button } from "@atlas/subframe/components/Button";
import { LinkButton } from "@atlas/subframe/components/LinkButton";
import { FeatherArrowRight, FeatherLock, FeatherMail } from "@subframe/core";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useCallback, useState } from "react";
import { FormField } from "@/components/ui/forms/FormField";
import { authClient } from "@/lib/auth-client";
import { SESSION_QUERY_KEY, sessionQueryOptions } from "@/lib/session-query";

type FieldErrors = Partial<Record<keyof SignInValues | "form", string>>;

interface SignInFormProps {
	onSuccess: (result: { isAdmin: boolean }) => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
	const queryClient = useQueryClient();
	const [values, setValues] = useState<SignInValues>({
		email: "",
		password: "",
	});
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);

	const update = useCallback(
		<K extends keyof SignInValues>(field: K, next: SignInValues[K]) => {
			setValues((prev) => ({ ...prev, [field]: next }));
			setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
		},
		[],
	);

	const onSubmit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (submitting) return;

			const result = signInSchema.safeParse(values);
			if (!result.success) {
				const next: FieldErrors = {};
				for (const issue of result.error.issues) {
					const key = issue.path[0] as keyof SignInValues | undefined;
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
				const signInResult = await authClient.signIn.email({
					email: result.data.email,
					password: result.data.password,
				});
				if (signInResult.error) {
					setErrors({
						form: signInResult.error.message ?? "Could not sign in",
					});
					return;
				}
				// Invalidate + refetch the session so the new auth cookie is reflected
				// in the cache before we navigate. `invalidateQueries` alone only
				// refetches active observers; nothing on /sign-in observes the session
				// query, so the /admin loader's `ensureQueryData` would otherwise
				// return the stale pre-login cache (null) and bounce the user back to
				// /sign-in. Using the refetched session is also more reliable than
				// `signInResult.data.user.role`, which is not guaranteed to be part
				// of Better Auth's sign-in response shape.
				await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
				const freshSession = await queryClient.fetchQuery(sessionQueryOptions);
				onSuccess({ isAdmin: freshSession?.user.role === "admin" });
			} catch (err) {
				setErrors({
					form: err instanceof Error ? err.message : "Could not sign in",
				});
			} finally {
				setSubmitting(false);
			}
		},
		[values, onSuccess, submitting, queryClient],
	);

	return (
		<>
			<div className="flex w-full flex-col items-start gap-2">
				<span className="text-heading-1 font-heading-1 text-default-font">
					Welcome back
				</span>
				<span className="text-body font-body text-subtext-color">
					Sign in to your Atlas Health account.
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
				<div className="flex w-full flex-col items-start gap-2">
					<FormField
						className="h-auto w-full flex-none"
						label="Password"
						icon={<FeatherLock />}
						type="password"
						placeholder="Enter your password"
						value={values.password}
						onChange={(v) => update("password", v)}
						error={errors.password}
						autoComplete="current-password"
					/>
					<div className="flex w-full items-center justify-end">
						<Link to="/forgot-password" className="no-underline">
							<LinkButton variant="brand" size="small">
								Forgot password?
							</LinkButton>
						</Link>
					</div>
				</div>
				{errors.form ? (
					<p className="text-caption font-caption text-error-700">
						{errors.form}
					</p>
				) : null}
				<Button
					className="h-10 w-full flex-none"
					size="large"
					icon={<FeatherArrowRight />}
					iconRight={null}
					type="submit"
					loading={submitting}
				>
					Sign in
				</Button>
			</form>
			<div className="flex w-full items-center justify-center gap-1">
				<span className="text-body font-body text-subtext-color">
					Don&rsquo;t have an account?
				</span>
				<Link to="/sign-up" className="no-underline">
					<LinkButton variant="brand">Get started</LinkButton>
				</Link>
			</div>
		</>
	);
}
