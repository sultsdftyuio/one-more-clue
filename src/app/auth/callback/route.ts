import type { EmailOtpType } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRecoveryGrant, RECOVERY_GRANT_COOKIE, recoveryGrantCookieOptions } from "@/lib/auth/recovery-grant";
import { PASSWORD_RESET_PATH, RECOVERY_LINK_INVALID_PATH, resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const VALID_OTP_TYPES: ReadonlySet<string> = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/**
 * Landing point for every Supabase email link (confirm sign-up, reset password)
 * and OAuth code exchange. Turns the link into a session, then redirects.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  if (!authEnabled()) return NextResponse.redirect(new URL("/login", origin));

  const params = url.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const otpType = rawType && VALID_OTP_TYPES.has(rawType) ? (rawType as EmailOtpType) : null;
  const nextPath = resolvePostAuthRedirectPath(params.get("next"));

  // A failed reset link needs the page that sends a new one, not the login page.
  // This only chooses where an error is shown; it grants nothing.
  const looksLikeReset = rawType === "recovery" || params.get("error_code") === "otp_expired" || nextPath === PASSWORD_RESET_PATH;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(looksLikeReset ? RECOVERY_LINK_INVALID_PATH : `/login?error=${reason}`, origin));

  if (!code && !(tokenHash && otpType)) return fail("invalid_link");

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    let userId: string | null = null;
    // True only when Supabase itself says the session came from a reset email,
    // never from `next`, which the visitor controls.
    let isRecovery = false;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] code exchange failed", { code: error.code, status: error.status });
        return fail("link_failed");
      }
      userId = data.user?.id ?? null;
      isRecovery = (data as { redirectType?: string | null }).redirectType === "PASSWORD_RECOVERY";
    } else if (tokenHash && otpType) {
      const { data, error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
      if (error) {
        console.warn("[auth/callback] link verification failed", { type: otpType, code: error.code });
        return fail("link_failed");
      }
      userId = data.user?.id ?? null;
      isRecovery = otpType === "recovery";
    }

    revalidatePath("/", "layout");

    if (isRecovery && userId) {
      cookieStore.set(RECOVERY_GRANT_COOKIE, createRecoveryGrant(userId), recoveryGrantCookieOptions());
      return NextResponse.redirect(new URL(PASSWORD_RESET_PATH, origin));
    }
    return NextResponse.redirect(new URL(nextPath, origin));
  } catch (error) {
    console.error("[auth/callback] unexpected failure", error);
    return NextResponse.redirect(new URL("/login?error=link_failed", origin));
  }
}
