"use client";

import Image from "next/image";
import { m, useReducedMotion } from "motion/react";
import { propArt } from "@/lib/art";

/**
 * Chunky stacked shadow that makes the letters read as 3D blocks. In em, so
 * the depth stays in proportion from the phone title to the desktop one.
 */
const extrude = {
  textShadow: [0.009, 0.018, 0.027, 0.036, 0.045, 0.054]
    .map((d) => `0 ${d}em 0 var(--color-ink)`)
    .concat("0 0.11em 0.2em rgba(0,0,0,0.45)")
    .join(", "),
};

function Letters({ text, start, className }: { text: string; start: number; className?: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <m.span
          key={i}
          className={`inline-block ${className ?? ""}`}
          style={{ ...extrude, transformOrigin: "50% 100%" }}
          initial={{ y: "-0.9em", rotateX: -80, opacity: 0 }}
          animate={{ y: 0, rotateX: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16, delay: start + i * 0.045 }}
          whileHover={{ y: -10, rotate: i % 2 ? 5 : -5, transition: { type: "spring", stiffness: 500, damping: 12 } }}
        >
          {ch === " " ? " " : ch}
        </m.span>
      ))}
    </>
  );
}

/**
 * "One More Clue": the letters drop in, then a magnifier sweeps across "Clue"
 * and each letter swells as the lens passes over it.
 */
export function HeroTitle() {
  const reduce = useReducedMotion();
  const sweepAt = 1.25;

  return (
    <h1 className="mt-6 font-display text-[clamp(3.5rem,9.35vw,7.5rem)] leading-[0.95] text-cream [perspective:800px]">
      <span className="sr-only">One More Clue</span>
      <span aria-hidden>
        <Letters text="One More " start={0.15} />
        <span className="relative inline-block whitespace-nowrap">
          {[..."Clue"].map((ch, i) => (
            <m.span
              key={i}
              className="inline-block text-mustard"
              style={{ ...extrude, transformOrigin: "50% 100%" }}
              initial={{ y: "-0.9em", rotateX: -80, opacity: 0 }}
              animate={
                reduce
                  ? { y: 0, rotateX: 0, opacity: 1 }
                  : { y: 0, rotateX: 0, opacity: 1, scale: [1, 1, 1.28, 1] }
              }
              transition={{
                default: { type: "spring", stiffness: 320, damping: 16, delay: 0.55 + i * 0.05 },
                scale: { duration: 0.5, delay: sweepAt + 0.12 + i * 0.13, times: [0, 0.01, 0.4, 1] },
              }}
              whileHover={{ y: -10, rotate: i % 2 ? 5 : -5 }}
            >
              {ch}
            </m.span>
          ))}
          {/* The lens slides across the word, then settles on the corner. */}
          <m.span
            className="pointer-events-none absolute top-[0.02em] left-0 w-[0.55em]"
            initial={{ x: "-0.6em", opacity: 0, rotate: -25 }}
            animate={{ x: ["-0.6em", "2.1em", "2.3em"], opacity: [0, 1, 1], rotate: [-25, 8, 18] }}
            transition={{ duration: 1.1, delay: sweepAt, ease: [0.22, 1, 0.36, 1], times: [0, 0.75, 1] }}
          >
            <Image src={propArt.magnifier} alt="" sizes="120px" className="w-full animate-float drop-shadow-[0_8px_10px_rgba(0,0,0,0.4)]" />
          </m.span>
        </span>
      </span>
    </h1>
  );
}
