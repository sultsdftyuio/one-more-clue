import { createClient } from "@/lib/supabase/server";
import { authEnabled } from "@/lib/supabase/env";

/** The verified signed-in user, or null when signed out or auth is switched off. */
export async function getCurrentUser() {
  if (!authEnabled()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch (error) {
    console.error("[auth] could not load the current user", error);
    return null;
  }
}
