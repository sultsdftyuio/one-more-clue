"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBlackout } from "@/components/home/blackout";
import { LitCity } from "@/components/home/LitCity";
import { sceneArt } from "@/lib/art";
import { cx } from "@/lib/cx";

const captions = {
  lit: "9:16 PM. Every light on the block is on.",
  dark: "9:17 PM. The whole block goes dark.",
  restored: "Lights back on. Liar caught.",
};

/**
 * The street and a big clock at the top of the warm-up. When the clock scrolls
 * into the middle of the screen it ticks to 9:17 and the block blacks out.
 */
export function BlackoutClock() {
  const { phase, cutLights } = useBlackout();
  const clock = useRef<HTMLDivElement>(null);
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
    <div className="relative -mx-4 -mt-20 mb-16 sm:-mx-6 sm:-mt-24">
      <LitCity
        lit={sceneArt.cityFront}
        dark={sceneArt.cityFrontDark}
        mode={phase === "lit" ? "glitch" : phase === "dark" ? "out" : "on"}
        className="aspect-[1600/460] max-h-[260px] min-h-[150px] w-full"
      />
      <div ref={clock} className="relative mx-auto -mt-6 w-fit text-center">
        <div
          className={cx(
            "flex items-center gap-1 rounded-2xl border-[0.1875rem] border-ink px-5 py-2 font-mono text-5xl font-bold tabular-nums shadow-card transition-colors duration-500 sm:text-6xl",
            phase === "dark" ? "bg-night text-coral [text-shadow:0_0_18px_rgba(239,91,91,0.8)]" : "bg-night text-mustard [text-shadow:0_0_18px_rgba(242,179,61,0.7)]",
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
          <span className="ml-2 text-2xl">PM</span>
        </div>
        <AnimatePresence mode="wait">
          <m.p
            key={phase}
            className="mt-3 text-sm font-extrabold tracking-widest text-cream/80 uppercase"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {captions[phase]}
          </m.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
