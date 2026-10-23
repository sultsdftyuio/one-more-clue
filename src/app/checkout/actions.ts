"use server";

import { redirect } from "next/navigation";
import { paidCaseById, productIdFor } from "@/data/catalog";
import { field } from "@/lib/auth/form";
import { getCurrentUser } from "@/lib/auth/session";
import { getDodoClient } from "@/lib/billing/dodo-client";
import { paymentsEnabled } from "@/lib/billing/env";
import { serializeError } from "@/lib/billing/payload";
import { ownsCase } from "@/lib/billing/purchases";
import { SITE_URL } from "@/lib/site";

/** Form action behind every "Buy" button: sign in if needed, then off to Dodo's hosted checkout. */
export async function startCheckout(form: FormData) {
  const paidCase = paidCaseById(field(form, "caseId"));
  const productId = paidCase ? productIdFor(paidCase) : null;
  if (!paidCase || !productId || !paymentsEnabled()) redirect("/play");

  const user = await getCurrentUser();
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(`/account?buy=${paidCase.id}`)}`);
  if (await ownsCase(paidCase.id)) redirect("/account?purchase=owned");

  let checkoutUrl: string;
  try {
    const { client } = getDodoClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email },
      // The webhook reads these to know who bought what.
      metadata: { user_id: user.id, case_id: paidCase.id },
      return_url: `${SITE_URL}/account?purchase=complete`,
    });
    if (!session.checkout_url) throw new Error("Checkout session returned without a URL.");
    checkoutUrl = session.checkout_url;
  } catch (error) {
    console.error("[checkout] could not start", { case_id: paidCase.id, error: serializeError(error) });
    redirect("/account?purchase=failed");
  }
  redirect(checkoutUrl);
}
