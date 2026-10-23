"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authCopy } from "@/data/auth";
import { EMAIL_PATTERN, field, maskEmail } from "@/lib/auth/form";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

export async function loginAction(_state: LoginState, form: FormData): Promise<LoginState> {
  if (!authEnabled()) return { error: authCopy.errors.disabled };

  const email = field(form, "email").trim().toLowerCase();
  const password = field(form, "password");
  const nextPath = resolvePostAuthRedirectPath(field(form, "next"));

  if (!email || !password) return { error: authCopy.errors.missing, email };
  if (!EMAIL_PATTERN.test(email)) return { error: authCopy.errors.email, email };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Same message for every failure, so the form can't reveal which emails have accounts.
      console.warn("[login] rejected", { email: maskEmail(email), code: error.code });
      return { error: authCopy.errors.badLogin, email };
    }
  } catch (error) {
    console.error("[login] failed", error);
    return { error: authCopy.errors.offline, email };
  }

  // redirect() works by throwing, so it stays outside the try/catch.
  revalidatePath("/", "layout");
  redirect(nextPath);
}
