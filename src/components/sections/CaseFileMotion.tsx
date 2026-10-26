"use client";

import { AnimatePresence, m } from "motion/react";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * The case file opens like a real folder: a manila cover, taped shut, swings
 * open in 3D the first time it scrolls into view.
 */
export function FolderCover({ code, children }: { code: string; children: ReactNode }) {
  return (
    <m.div className="relative [perspective:1800px]" initial="closed" whileInView="open" viewport={{ once: true, amount: 0.35 }}>
      {children}
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -rotate-1 rounded-3xl border-[0.1875rem] border-ink bg-[#e3bf7c] shadow-card [backface-visibility:hidden] [transform-origin:left_center]"
        variants={{
          closed: { rotateY: 0, opacity: 1 },
          open: { rotateY: -168, opacity: [1, 1, 0], transition: { rotateY: { type: "spring", stiffness: 40, damping: 12, delay: 0.35 }, opacity: { duration: 1.6, times: [0, 0.8, 1], delay: 0.35 } } },
        }}
      >
        {/* Tape that tears first. */}
        <m.span
          className="absolute top-1/2 -right-3 h-10 w-28 -translate-y-1/2 rotate-[-8deg] bg-white/70"
          variants={{ closed: { scaleX: 1, opacity: 1 }, open: { scaleX: 0, opacity: 0, transition: { duration: 0.3 } } }}
          style={{ transformOrigin: "right center" }}
        />
        <span className="absolute -top-5 left-8 h-8 w-36 rounded-t-xl border-[0.1875rem] border-b-0 border-ink bg-[#e3bf7c]" />
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-ink">
          <span className="font-display text-3xl tracking-widest">{code}</span>
          <span className="-rotate-12 rounded-lg border-[0.3125rem] border-coral px-4 py-1 font-display text-4xl tracking-widest text-coral uppercase opacity-90">
            Confidential
          </span>
        </div>
      </m.div>
    </m.div>
  );
}

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

/** Evidence cards pinned to the file one by one, each at its own slight angle. */
export function PinIn({ children, index, className }: { children: ReactNode; index: number; className?: string }) {
  const tilt = [-3, 2, -1.5, 3, -2][index % 5];
  return (
    <m.li
      className={cx("relative", className)}
      initial={{ opacity: 0, y: -40, rotate: tilt * 4, scale: 1.1 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ type: "spring", stiffness: 140, damping: 13, delay: 0.9 + index * 0.1 }}
      whileHover={{ rotate: 0, y: -6, scale: 1.04 }}
    >
      {children}
    </m.li>
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
