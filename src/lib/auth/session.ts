import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { authEnabled } from "@/lib/supabase/env";

/** The verified signed-in user, or null when signed out or auth is switched off. */
export async function getCurrentUser() {
  if (!authEnabled()) return null;
  // Outside the try: during the build this throws Next's "render on demand"
  // signal, which must reach Next instead of being logged as a failure.
  const cookieStore = await cookies();
  try {
    const supabase = await createClient(cookieStore);
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch (error) {
    console.error("[auth] could not load the current user", error);
    return null;
  }
}
