import type DodoPayments from "dodopayments";
import { NextResponse } from "next/server";
import { paidCaseById } from "@/data/catalog";
import { getDodoClient } from "@/lib/billing/dodo-client";
import { asRecord, readCheckoutMetadata, readNumber, readString, serializeError, topLevelKeys } from "@/lib/billing/payload";
import { markRefunded, recordPaidPurchase } from "@/lib/billing/purchases";

export const runtime = "nodejs";

type DodoEvent = { type: string; data?: unknown };

/**
 * Dodo retries every non-2xx response, so events this endpoint can never use
 * are acknowledged (and logged) instead of rejected.
 */
const ignored = (type: string, reason: string) => {
  console.warn("[dodo webhook] ignored", { event_type: type, reason });
  return NextResponse.json({ status: "ignored", event_type: type, reason });
};

const failed = (message: string) => NextResponse.json({ error: message }, { status: 500 });

/**
 * The event is only a signal; the payment as Dodo reports it *now* is the truth.
 * Webhooks can arrive late, repeated or out of order.
 */
async function handlePaymentSucceeded(dodo: DodoPayments, event: DodoEvent) {
  const paymentId = readString(asRecord(event.data), "payment_id");
  if (!paymentId) return ignored(event.type, "missing_payment_id");

  const payment = asRecord(await dodo.payments.retrieve(paymentId));
  if (readString(payment, "status") !== "succeeded") return ignored(event.type, "payment_not_succeeded");

  const buyer = payment && readCheckoutMetadata(payment);
  if (!buyer || !paidCaseById(buyer.caseId)) {
    console.error("[dodo webhook] payment without usable metadata", { payment_id: paymentId, keys: topLevelKeys(asRecord(payment?.metadata)) });
    return ignored(event.type, "missing_checkout_metadata");
  }

  await recordPaidPurchase({
    userId: buyer.userId,
    caseId: buyer.caseId,
    paymentId,
    amount: readNumber(payment, "total_amount"),
    currency: readString(payment, "currency"),
  });
  console.info("[dodo webhook] purchase recorded", { payment_id: paymentId, case_id: buyer.caseId });
  return NextResponse.json({ status: "ok", event_type: event.type });
}

/** Policy: any successful refund (even partial) takes the case back. Cheap cases, simple rule. */
async function handleRefundSucceeded(dodo: DodoPayments, event: DodoEvent) {
  const refundId = readString(asRecord(event.data), "refund_id");
  if (!refundId) return ignored(event.type, "missing_refund_id");

  const refund = asRecord(await dodo.refunds.retrieve(refundId));
  const paymentId = readString(refund, "payment_id");
  if (readString(refund, "status") !== "succeeded" || !paymentId) return ignored(event.type, "refund_not_succeeded");

  await markRefunded(paymentId);
  console.info("[dodo webhook] purchase refunded", { payment_id: paymentId });
  return NextResponse.json({ status: "ok", event_type: event.type });
}

export async function POST(request: Request) {
  let dodo: DodoPayments;
  try {
    dodo = getDodoClient({ requireWebhookKey: true }).client;
  } catch (error) {
    console.error("[dodo webhook] not configured", serializeError(error));
    return failed("Dodo webhook is not configured.");
  }

  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  let event: DodoEvent;
  try {
    event = dodo.webhooks.unwrap(rawBody, { headers }) as unknown as DodoEvent;
  } catch (error) {
    console.error("[dodo webhook] signature verification failed", serializeError(error));
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    if (event.type === "payment.succeeded") return await handlePaymentSucceeded(dodo, event);
    if (event.type === "refund.succeeded") return await handleRefundSucceeded(dodo, event);
    return ignored(event.type, "unhandled_event_type");
  } catch (error) {
    // A 500 makes Dodo retry later, which is what we want for a transient failure.
    console.error("[dodo webhook] processing failed", { event_type: event.type, error: serializeError(error) });
    return failed("Could not process the event.");
  }
}
