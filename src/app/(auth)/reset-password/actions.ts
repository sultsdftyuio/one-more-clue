"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCopy } from "@/data/auth";
import { field } from "@/lib/auth/form";
import { describeNewPasswordProblem } from "@/lib/auth/password-rules";
import { isRecoveryGrantValid, RECOVERY_GRANT_COOKIE, recoveryGrantCookieOptions } from "@/lib/auth/recovery-grant";
import { RECOVERY_LINK_INVALID_PATH } from "@/lib/auth/redirects";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error?: string };

/** Sets a new password for someone who arrived through a verified reset link. */
export async function updatePassword(_state: ResetPasswordState, form: FormData): Promise<ResetPasswordState> {
  if (!authEnabled()) return { error: authCopy.errors.disabled };

  const password = field(form, "password");
  const problem = describeNewPasswordProblem(password);
  if (problem) return { error: problem };

  let linkStillValid = true;
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user || !isRecoveryGrantValid(cookieStore.get(RECOVERY_GRANT_COOKIE)?.value, user.id)) {
      linkStillValid = false;
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.warn("[reset-password] rejected", { code: error.code });
        if (error.code === "same_password") return { error: authCopy.errors.samePassword };
        if (error.code === "weak_password") return { error: error.message };
        return { error: authCopy.errors.resetFailed };
      }
      cookieStore.delete({ name: RECOVERY_GRANT_COOKIE, path: recoveryGrantCookieOptions().path });
      // End every session: whoever prompted the reset may still be signed in elsewhere.
      // The password is already changed, so a failure here isn't reported as a failed reset.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
      if (signOutError) console.error("[reset-password] could not end sessions", { code: signOutError.code });
    }
  } catch (error) {
    console.error("[reset-password] failed", error);
    return { error: authCopy.errors.offline };
  }

  redirect(linkStillValid ? "/login?reset=done" : RECOVERY_LINK_INVALID_PATH);
}
