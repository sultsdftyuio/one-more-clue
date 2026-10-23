import { supabaseConfig } from "@/lib/supabase/env";

/** Payments need Dodo plus Supabase (accounts to buy with, a table to record purchases). */
export function paymentsEnabled() {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && supabaseConfig());
}
