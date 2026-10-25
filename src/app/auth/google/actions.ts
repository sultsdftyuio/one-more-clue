"use server";

import { redirect } from "next/navigation";
import { field } from "@/lib/auth/form";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { SITE_URL } from "@/lib/site";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Form action behind "Continue with Google": off to Google via Supabase, which
 * sends the player back to /auth/callback to turn the code into a session.
 * Signs in an existing account or creates a new one, so login and register share it.
 */
export async function startGoogleSignIn(form: FormData) {
  if (!authEnabled()) redirect("/login");
  const nextPath = resolvePostAuthRedirectPath(field(form, "next"));

  let url: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (error || !data.url) throw error ?? new Error("Supabase returned no Google URL.");
    url = data.url;
  } catch (error) {
    console.error("[auth/google] could not start", error);
    redirect(`/login?error=google&next=${encodeURIComponent(nextPath)}`);
  }
  // redirect() works by throwing, so it stays outside the try/catch.
  redirect(url);
}
