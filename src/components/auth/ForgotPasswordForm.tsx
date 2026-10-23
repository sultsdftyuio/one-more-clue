"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/(auth)/forgot-password/actions";
import { authCopy } from "@/data/auth";
import { AuthLink } from "./AuthLink";
import { Field } from "./Field";
import { FormNotice } from "./FormNotice";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm({ linkExpired }: { linkExpired: boolean }) {
  const [state, action] = useActionState<ForgotPasswordState, FormData>(requestPasswordReset, {});
  const copy = authCopy.forgot;

  if (state.sentTo) {
    return (
      <>
        <FormNotice tone="success">{copy.sent(state.sentTo)}</FormNotice>
        <AuthLink href="/login" label={copy.back} />
      </>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <FormNotice tone="error">{state.error}</FormNotice>
      ) : linkExpired ? (
        <FormNotice tone="error">{authCopy.errors.recoveryLinkInvalid}</FormNotice>
      ) : (
        <p className="font-semibold text-ink/80">{copy.text}</p>
      )}
      <Field label={authCopy.fields.email} name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      <SubmitButton label={copy.submit} />
      <AuthLink href="/login" label={copy.back} />
    </form>
  );
}
