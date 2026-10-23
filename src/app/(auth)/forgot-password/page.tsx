import type { Metadata } from "next";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { authCopy } from "@/data/auth";
import { authEnabled } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Reset password" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  if (!authEnabled()) return <AuthDisabled />;
  const { error } = await searchParams;

  return (
    <AuthShell eyebrow={authCopy.forgot.eyebrow} title={authCopy.forgot.title}>
      <ForgotPasswordForm linkExpired={error === "recovery_link_invalid"} />
    </AuthShell>
  );
}
