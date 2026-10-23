import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type NewPurchase = { userId: string; caseId: string; paymentId: string; amount: number | null; currency: string | null };

/**
 * Records a paid purchase once. A retried or late `payment.succeeded` for a
 * payment already on file changes nothing, so it can't undo a refund.
 */
export async function recordPaidPurchase(p: NewPurchase) {
  const { error } = await createServiceRoleClient()
    .from("purchases")
    .upsert(
      { user_id: p.userId, case_id: p.caseId, payment_id: p.paymentId, status: "paid", amount: p.amount, currency: p.currency },
      { onConflict: "payment_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Could not record purchase: ${error.message}`);
}

export async function markRefunded(paymentId: string) {
  const { error } = await createServiceRoleClient().from("purchases").update({ status: "refunded" }).eq("payment_id", paymentId);
  if (error) throw new Error(`Could not mark purchase refunded: ${error.message}`);
}

/** The signed-in player's purchases (row-level security limits this to their own rows). */
export async function listMyPurchases() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("case_id, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load purchases: ${error.message}`);
  return data;
}

export async function ownsCase(caseId: string) {
  const purchases = await listMyPurchases();
  return purchases.some((p) => p.case_id === caseId && p.status === "paid");
}
