"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBlackout } from "@/components/home/blackout";
import { cx } from "@/lib/cx";

const captions = {
  lit: "It's 9:16 PM. Keep scrolling.",
  dark: "9:17 PM. The whole block goes dark.",
  restored: "Lights back on. Liar caught.",
};

/**
 * The big clock on the hero's street. Once it scrolls above the middle of the
 * screen it ticks to 9:17 and the street behind it blacks out, while you can
 * still see it.
 */
export function BlackoutClock({ className }: { className?: string }) {
  const { phase, cutLights } = useBlackout();
  const clock = useRef<HTMLAnchorElement>(null);
  const [reached, setReached] = useState(false);
  const minute = phase === "lit" ? "16" : phase === "dark" ? "17" : "18";

  // Reached once the clock is above the middle of the screen, even if a jump
  // or a fast flick skipped straight past it.
  useEffect(() => {
    if (reached) return;
    const check = () => {
      const top = clock.current?.getBoundingClientRect().top;
      if (top !== undefined && top < window.innerHeight * 0.55) setReached(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [reached]);

  useEffect(() => {
    if (!reached) return;
    const t = window.setTimeout(cutLights, 650);
    return () => window.clearTimeout(t);
  }, [reached, cutLights]);

  // Ticks to 9:17 the moment it's reached, a beat before the power goes.
  const shown = reached && phase === "lit" ? "17" : minute;

  return (
    <m.a
      ref={clock}
      href="#mini-case"
      className={cx("block w-fit text-center", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.9, type: "spring", stiffness: 160, damping: 18 }}
    >
      <div
        className={cx(
          "mx-auto flex w-fit items-center gap-1 rounded-2xl border-[0.1875rem] border-ink bg-night px-4 py-1.5 font-mono text-4xl font-bold tabular-nums shadow-card transition-colors duration-500 sm:text-5xl",
          phase === "dark" ? "text-coral [text-shadow:0_0_18px_rgba(239,91,91,0.8)]" : "text-mustard [text-shadow:0_0_18px_rgba(242,179,61,0.7)]",
        )}
        aria-live="polite"
      >
        <span>9</span>
        <m.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
          :
        </m.span>
        <span className="relative inline-block h-[1em] w-[1.25em] overflow-hidden leading-none [perspective:400px]">
          <AnimatePresence initial={false}>
            <m.span
              key={shown}
              className="absolute inset-0"
              initial={{ rotateX: -90, y: "-40%", opacity: 0 }}
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              exit={{ rotateX: 90, y: "40%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              {shown}
            </m.span>
          </AnimatePresence>
        </span>
        <span className="ml-2 text-xl">PM</span>
      </div>
      <AnimatePresence mode="wait">
        <m.p
          key={phase}
          className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-cream/30 bg-night/70 px-3 py-1 text-xs font-extrabold tracking-widest text-cream uppercase backdrop-blur"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          {captions[phase]}
          {phase === "lit" && (
            <m.span aria-hidden animate={{ y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
              ↓
            </m.span>
          )}
        </m.p>
      </AnimatePresence>
    </m.a>
  );
}
