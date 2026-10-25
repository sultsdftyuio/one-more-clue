"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/(auth)/login/actions";
import { authCopy } from "@/data/auth";
import { AuthLink } from "./AuthLink";
import { Field } from "./Field";
import { FormNotice } from "./FormNotice";
import { GoogleButton } from "./GoogleButton";
import { SubmitButton } from "./SubmitButton";

type Props = { next: string; google: boolean; notice?: { tone: "error" | "success"; text: string } };

export function LoginForm({ next, google, notice }: Props) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  const copy = authCopy.login;
  const message = state.error ? { tone: "error" as const, text: state.error } : notice;

  return (
    <>
      {message && <FormNotice tone={message.tone}>{message.text}</FormNotice>}
      {google && (
        <div className={message ? "mt-4" : undefined}>
          <GoogleButton next={next} />
        </div>
      )}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label={authCopy.fields.email} name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        <Field label={authCopy.fields.password} name="password" type="password" autoComplete="current-password" required />
        <SubmitButton label={copy.submit} />
        <AuthLink href="/forgot-password" label={copy.forgot} />
        <AuthLink prompt={copy.switchPrompt} href={`/register?next=${encodeURIComponent(next)}`} label={copy.switchLink} />
      </form>
    </>
  );
}
