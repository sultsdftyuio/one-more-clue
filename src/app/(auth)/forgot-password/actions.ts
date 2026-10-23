"use server";

import { authCopy } from "@/data/auth";
import { EMAIL_PATTERN, field } from "@/lib/auth/form";
import { PASSWORD_RESET_PATH } from "@/lib/auth/redirects";
import { SITE_URL } from "@/lib/site";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error?: string; email?: string; sentTo?: string };

/**
 * Emails a password-reset link. The answer is the same whether or not an
 * account exists, so this form can't be used to find out who has one.
 */
export async function requestPasswordReset(_state: ForgotPasswordState, form: FormData): Promise<ForgotPasswordState> {
  if (!authEnabled()) return { error: authCopy.errors.disabled };

  const email = field(form, "email").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: authCopy.errors.email, email };

  try {
    const supabase = await createClient();
    // `next` only labels the link as a reset so a failed link is explained properly.
    // Permission to set a password comes from the callback verifying the link.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(PASSWORD_RESET_PATH)}`,
    });
    // Supabase only rate-limits addresses that have an account; treating that
    // differently would reveal the account exists.
    if (error && error.status !== 429) {
      console.error("[forgot-password] send failed", { code: error.code, status: error.status });
      return { error: authCopy.errors.resetSendFailed, email };
    }
  } catch (error) {
    console.error("[forgot-password] failed", error);
    return { error: authCopy.errors.offline, email };
  }
  return { sentTo: email };
}
