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

/** Pages a purchase may return to: the host page (to start the case straight away) or the account page. */
const RETURN_PATHS = ["/host", "/account"];

/** Form action behind every "Buy" button: sign in if needed, then off to Dodo's hosted checkout. */
export async function startCheckout(form: FormData) {
  const paidCase = paidCaseById(field(form, "caseId"));
  const productId = paidCase ? productIdFor(paidCase) : null;
  if (!paidCase || !productId || !paymentsEnabled()) redirect("/play");
  const back = RETURN_PATHS.includes(field(form, "returnTo")) ? field(form, "returnTo") : "/account";

  const user = await getCurrentUser();
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(back === "/host" ? "/host" : `/account?buy=${paidCase.id}`)}`);
  // A bundle counts as owned once every case in it is.
  const owned = paidCase.includes ? (await Promise.all(paidCase.includes.map(ownsCase))).every(Boolean) : await ownsCase(paidCase.id);
  if (owned) redirect(back === "/host" ? `/host?owned=${paidCase.id}` : "/account?purchase=owned");

  let checkoutUrl: string;
  try {
    const { client } = getDodoClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email },
      // The webhook reads these to know who bought what.
      metadata: { user_id: user.id, case_id: paidCase.id },
      return_url: back === "/host" ? `${SITE_URL}/host?purchased=${paidCase.id}` : `${SITE_URL}/account?purchase=complete`,
    });
    if (!session.checkout_url) throw new Error("Checkout session returned without a URL.");
    checkoutUrl = session.checkout_url;
  } catch (error) {
    console.error("[checkout] could not start", { case_id: paidCase.id, error: serializeError(error) });
    redirect(back === "/host" ? "/host?purchase=failed" : "/account?purchase=failed");
  }
  redirect(checkoutUrl);
}
