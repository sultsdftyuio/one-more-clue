"use client";

import { m, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";

/** The hero copy drifts up and fades as the camera pushes into the street. */
export function ScrollAway({ children, className }: { children: ReactNode; className?: string }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, -140]);
  const opacity = useTransform(scrollY, [0, 450], [1, 0]);
  return (
    <m.div className={className} style={{ y, opacity }}>
      {children}
    </m.div>
  );
}

/** Pieces of the hero that pop in one after another once the title has landed. */
export function PopIn({ children, delay, className, as = "div" }: { children: ReactNode; delay: number; className?: string; as?: "div" | "li" }) {
  const Tag = as === "li" ? m.li : m.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 18, delay }}
    >
      {children}
    </Tag>
  );
}

/** "It's 9:16 PM. Keep scrolling." The countdown to the blackout. */
export function ScrollCue() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 160], [1, 0]);
  return (
    <m.a
      href="#mini-case"
      className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-sm font-extrabold text-cream/80 md:flex"
      style={{ opacity }}
      initial={{ y: 20 }}
      animate={{ y: 0 }}
      transition={{ delay: 2.6 }}
    >
      <span className="rounded-full border-2 border-cream/30 bg-night/60 px-3 py-1 backdrop-blur">It&apos;s 9:16 PM. Keep scrolling.</span>
      <m.span
        aria-hidden
        className="text-xl"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        ↓
      </m.span>
    </m.a>
  );
}
