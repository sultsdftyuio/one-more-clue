import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

const tones = {
  error: "border-coral bg-coral/10 text-coral-dk",
  success: "border-teal bg-teal/15 text-ink",
};

/** Inline message under a form title; errors are announced to screen readers. */
export function FormNotice({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cx("rounded-2xl border-2 px-4 py-3 font-bold", tones[tone])}>
      {children}
    </p>
  );
}
