"use server";

import { notify } from "@/data/notify";
import { cleanSource, getWaitlistStore, normalizeEmail } from "@/lib/waitlist";

export type NotifyState = {
  status: "idle" | "success" | "error";
  message: string;
  /** What the visitor typed, so a failed attempt doesn't clear the field. */
  email?: string;
};

export async function joinWaitlist(_prev: NotifyState, form: FormData): Promise<NotifyState> {
  // Honeypot: people never see this field, bots fill it. Accept quietly, store nothing.
  if (form.get("company")) return { status: "success", message: notify.messages.added };

  const raw = form.get("email");
  const email = normalizeEmail(raw);
  if (!email) {
    return { status: "error", message: notify.messages.invalid, email: typeof raw === "string" ? raw : "" };
  }

  try {
    const result = await getWaitlistStore().add({
      email,
      source: cleanSource(form.get("source")),
      createdAt: new Date().toISOString(),
    });
    return { status: "success", message: notify.messages[result] };
  } catch (error) {
    console.error("[waitlist] signup failed", error);
    return { status: "error", message: notify.messages.failed, email };
  }
}
