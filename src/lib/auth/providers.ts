import { supabaseConfig } from "@/lib/supabase/env";

/**
 * True once Google is switched on in Supabase (Authentication → Providers), so
 * the button never leads to a "provider is not enabled" error. Read from
 * Supabase's public settings and cached for five minutes.
 */
export async function googleAuthEnabled() {
  const config = supabaseConfig();  if (!config) return false;
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.anonKey },
      next: { revalidate: 300 },
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
