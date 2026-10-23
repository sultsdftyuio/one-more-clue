import type { Metadata } from "next";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { authCopy } from "@/data/auth";
import { authEnabled } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached only through a verified reset link; the form's action checks the recovery grant.
export default function ResetPasswordPage() {
  if (!authEnabled()) return <AuthDisabled />;
  return (
    <AuthShell eyebrow={authCopy.reset.eyebrow} title={authCopy.reset.title}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
