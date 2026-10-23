"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  if (authEnabled()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut();
      if (error) console.error("[logout] sign out failed", { code: error.code });
    } catch (error) {
      console.error("[logout] failed", error);
    }
  }
  revalidatePath("/", "layout");
  redirect("/");
}
