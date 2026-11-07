"use client";

import { AnimatePresence, m } from "motion/react";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/** A prop that flies in from off to the side and lands with a bounce. */
export function FlyIn({ children, from, className, delay = 0 }: { children: ReactNode; from: "left" | "right" | "top"; className?: string; delay?: number }) {
  const start = { left: { x: -260, y: -40, rotate: -40 }, right: { x: 260, y: -60, rotate: 50 }, top: { x: 0, y: -220, rotate: 30 } }[from];
  return (
    <m.div
      className={className}
      initial={{ ...start, opacity: 0 }}
      whileInView={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", stiffness: 70, damping: 11, delay }}
    >
      {children}
    </m.div>
  );
}

/** A black bar over a name. Tapping it doesn't reveal anything; that's the case's job. */
export function Redacted({ className }: { className?: string }) {
  const [tried, setTried] = useState(false);
  return (
    <span className="relative inline-block">
      <m.button
        type="button"
        aria-label="Redacted name"
        className={cx("redacted cursor-help px-1", className)}
        onClick={() => {
          setTried(true);
          window.setTimeout(() => setTried(false), 1400);
        }}
        animate={tried ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
      >
        ██████
      </m.button>
      <AnimatePresence>
        {tried && (
          <m.span
            role="status"
            className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-ink bg-coral px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-cream"
            initial={{ opacity: 0, y: 6, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
          >
            Nice try. Classified.
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}
