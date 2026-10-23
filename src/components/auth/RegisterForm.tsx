"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/app/(auth)/register/actions";
import { authCopy } from "@/data/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { AuthLink } from "./AuthLink";
import { Field } from "./Field";
import { FormNotice } from "./FormNotice";
import { SubmitButton } from "./SubmitButton";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<RegisterState, FormData>(registerAction, {});
  const copy = authCopy.register;

  if (state.sentTo) return <FormNotice tone="success">{copy.checkEmail(state.sentTo)}</FormNotice>;

  return (
    <form action={action} className="space-y-4">
      {state.error && <FormNotice tone="error">{state.error}</FormNotice>}
      <input type="hidden" name="next" value={next} />
      <Field label={authCopy.fields.email} name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      <Field
        label={authCopy.fields.password}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
        hint={authCopy.fields.passwordHint}
      />
      <SubmitButton label={copy.submit} />
      <AuthLink prompt={copy.switchPrompt} href={`/login?next=${encodeURIComponent(next)}`} label={copy.switchLink} />
    </form>
  );
}
