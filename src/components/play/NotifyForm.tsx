"use client";

import { useActionState, useEffect } from "react";
import { joinWaitlist, type NotifyState } from "@/app/play/actions";
import { Button } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import { notify } from "@/data/notify";
import { trackEvent } from "@/lib/analytics";
import { cx } from "@/lib/cx";

const initial: NotifyState = { status: "idle", message: "" };

export function NotifyForm({ source }: { source: string }) {
  const [state, action, pending] = useActionState(joinWaitlist, initial);

  useEffect(() => {
    if (state.status === "success") trackEvent("notify_signup", { source });
  }, [state, source]);

  if (state.status === "success") {
    return (
      <div className="animate-pop-in rounded-3xl border-[3px] border-ink bg-mustard p-6 text-ink shadow-card" role="status">
        <p className="font-display text-3xl">You&apos;re in, detective.</p>
        <p className="mt-2 text-lg font-bold">{state.message}</p>
        <p className="mt-5 font-semibold">Know a group that would crack it first?</p>
        <ShareButton message={notify.shareMessage} className="mt-3" />
      </div>
    );
  }

  const invalid = state.status === "error";
  return (
    <form action={action} className="relative rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card sm:p-5">
      <label htmlFor="notify-email" className="sr-only">
        {notify.label}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="notify-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          placeholder={notify.placeholder}
          aria-invalid={invalid}
          aria-describedby="notify-help"
          className="w-full min-w-0 flex-1 rounded-full border-[3px] border-ink bg-cream px-5 py-3 text-lg font-bold text-ink placeholder:text-ink/40 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-mustard"
        />
        <Button type="submit" disabled={pending}>
          {pending ? notify.pending : notify.button}
        </Button>
      </div>
      <input type="hidden" name="source" value={source} />
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p
        id="notify-help"
        aria-live="polite"
        className={cx("mt-3 px-2 text-sm font-bold", invalid ? "text-coral" : "text-cream/70")}
      >
        {invalid ? state.message : notify.privacy}
      </p>
    </form>
  );
}
