"use client";

import { useActionState } from "react";
import { updatePassword, type ResetPasswordState } from "@/app/(auth)/reset-password/actions";
import { authCopy } from "@/data/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { Field } from "./Field";
import { FormNotice } from "./FormNotice";
import { SubmitButton } from "./SubmitButton";

export function ResetPasswordForm() {
  const [state, action] = useActionState<ResetPasswordState, FormData>(updatePassword, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <FormNotice tone="error">{state.error}</FormNotice>}
      <Field
        label={authCopy.fields.newPassword}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
        hint={authCopy.fields.passwordHint}
      />
      <SubmitButton label={authCopy.reset.submit} />
    </form>
  );
}
