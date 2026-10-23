import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getSupabaseCookieOptions } from "./cookie-options";
import { requiredEnv } from "./env";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** Per-request client acting as the signed-in visitor (row-level security applies). */
export async function createClient(cookieStore?: CookieStore) {
  const store = cookieStore ?? (await cookies());
  return createServerClient<Database>(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components can't set cookies; the middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Server-only client that bypasses row-level security. Used by the payment webhook. */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
