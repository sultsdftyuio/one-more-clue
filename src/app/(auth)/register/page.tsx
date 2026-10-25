import type { Metadata } from "next";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { authCopy } from "@/data/auth";
import { googleAuthEnabled } from "@/lib/auth/providers";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { authEnabled } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Create account" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  if (!authEnabled()) return <AuthDisabled />;
  const { next } = await searchParams;

  return (
    <AuthShell eyebrow={authCopy.register.eyebrow} title={authCopy.register.title}>
      <RegisterForm next={resolvePostAuthRedirectPath(next)} google={await googleAuthEnabled()} />
    </AuthShell>
  );
}
