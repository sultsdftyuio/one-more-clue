"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authCopy } from "@/data/auth";
import { EMAIL_PATTERN, field, maskEmail } from "@/lib/auth/form";
import { describeNewPasswordProblem } from "@/lib/auth/password-rules";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { SITE_URL } from "@/lib/site";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = { error?: string; email?: string; sentTo?: string };

export async function registerAction(_state: RegisterState, form: FormData): Promise<RegisterState> {
  if (!authEnabled()) return { error: authCopy.errors.disabled };

  const email = field(form, "email").trim().toLowerCase();
  const password = field(form, "password");
  const nextPath = resolvePostAuthRedirectPath(field(form, "next"));

  if (!EMAIL_PATTERN.test(email)) return { error: authCopy.errors.email, email };
  const problem = describeNewPasswordProblem(password);
  if (problem) return { error: problem, email };

  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (error) {
      console.warn("[register] rejected", { email: maskEmail(email), code: error.code });
      return { error: error.message || authCopy.errors.offline, email };
    }
    // With email confirmation on (the default) there is no session until the link is opened.
    signedIn = Boolean(data.session);
  } catch (error) {
    console.error("[register] failed", error);
    return { error: authCopy.errors.offline, email };
  }

  if (!signedIn) return { sentTo: email };
  revalidatePath("/", "layout");
  redirect(nextPath);
}
