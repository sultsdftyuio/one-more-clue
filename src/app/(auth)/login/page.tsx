import type { Metadata } from "next";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { authCopy } from "@/data/auth";
import { googleAuthEnabled } from "@/lib/auth/providers";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { authEnabled } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Log in" };

const loginErrors: Record<string, string> = { google: authCopy.errors.google, signin_failed: authCopy.errors.signinFailed };

type Props ={ searchParams: Promise<{ next?: string; reset?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (!authEnabled()) return <AuthDisabled />;
  const params = await searchParams;
  const notice = params.reset === "done"
    ? { tone: "success" as const, text: authCopy.login.resetDone }
    : params.error
      ? { tone: "error" as const, text: loginErrors[params.error] ?? authCopy.errors.linkFailed }
      : undefined;

  return (
    <AuthShell eyebrow={authCopy.login.eyebrow} title={authCopy.login.title}>
      <LoginForm next={resolvePostAuthRedirectPath(params.next)} google={await googleAuthEnabled()} notice={notice} />
    </AuthShell>
  );
}
