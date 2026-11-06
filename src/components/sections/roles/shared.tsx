"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { roles, type RoleId } from "@/data/roles";
import { cx } from "@/lib/cx";

export const tintOf = (role: RoleId) => roles.find((r) => r.id === role)!.tint;

/** The button that hands the lead to the next role. */
export function Handoff({ to, onClick, children }: { to: RoleId; onClick: () => void; children: ReactNode }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      className={cx("mt-5 inline-flex items-center gap-2 rounded-full border-[0.1875rem] border-ink px-5 py-2 font-display text-lg shadow-pop-sm transition-transform hover:-translate-y-0.5", tintOf(to))}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {children} <span aria-hidden>→</span>
    </m.button>
  );
}

/** One line under a tool saying what it costs in the real game. */
export function Cost({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 text-xs font-bold text-cream/60">
      <svg viewBox="0 0 24 24" aria-hidden className="mt-px size-4 shrink-0 fill-none stroke-current stroke-2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

/** A quiet, inline status line, for hints and results. */
export function Note({ children, tone = "text-cream/70" }: { children: ReactNode; tone?: string }) {
  return (
    <m.p className={cx("mt-4 text-sm font-bold", tone)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {children}
    </m.p>
  );
}
