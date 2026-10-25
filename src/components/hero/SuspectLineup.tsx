"use client";

import Image from "next/image";
import { AnimatePresence, m, useAnimationControls, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { usePointer } from "@/components/fx/pointer";
import { suspects, type Suspect } from "@/data/suspects";
import { suspectArt } from "@/lib/art";

/** Who says what over the lineup, in turn. None of it gives the warm-up away. */
const LINES = ["One of us is lying.", "Don't look at me.", "I have an alibi!", "…Mostly."];

function Character({ suspect, index, talking }: { suspect: Suspect; index: number; talking: boolean }) {
  const { x } = usePointer();
  // Everyone leans toward the cursor; the ones further from it lean more.
  const lean = useTransform(x, [-1, 1], [-7 - index * 1.5, 7 + (3 - index) * 1.5]);
  const shift = useTransform(x, [-1, 1], [-4, 4]);
  const jump = useAnimationControls();
  const [shocked, setShocked] = useState(false);

  const poke = () => {
    setShocked(true);
    void jump.start({ y: [0, -38, 0, -10, 0], transition: { duration: 0.65, times: [0, 0.35, 0.65, 0.82, 1] } });
    window.setTimeout(() => setShocked(false), 1100);
  };

  return (
    <m.button
      type="button"
      onClick={poke}
      aria-label={`Poke ${suspect.name}`}
      className="-mx-1 mb-[calc(var(--w)*-0.1)] w-(--w) focus-visible:outline-none"
      style={{ rotate: lean, x: shift, transformOrigin: "50% 95%" }}
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.9 + index * 0.12 }}
    >
      <m.span className="block" animate={jump}>
        <m.span
          className="block"
          animate={talking ? { y: [0, -8, 0], scaleY: [1, 1.04, 1] } : { y: 0 }}
          transition={{ duration: 0.45, repeat: talking ? 2 : 0 }}
        >
          <Image
            src={shocked ? suspectArt[suspect.id].shocked : suspectArt[suspect.id].idle}
            alt=""
            sizes="170px"
            priority
            className="animate-bob drop-shadow-[0_10px_8px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: `${index * -0.8}s` }}
          />
        </m.span>
      </m.span>
    </m.button>
  );
}

/**
 * The four suspects standing on the street. They lean toward your cursor, jump
 * when poked, and take turns talking. The art has ~10% of its width as empty
 * space under the feet, so each one is pulled down by that much.
 */
export function SuspectLineup({ bubble }: { bubble: string }) {
  const [turn, setTurn] = useState(0);
  const lines = [bubble, ...LINES.slice(1)];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTurn((t) => (t + 1) % lines.length), 3200);
    return () => window.clearInterval(id);
  }, [lines.length]);

  const speaker = turn % suspects.length;

  return (
    <div className="relative flex items-end justify-center [--w:clamp(76px,10.5vw,170px)]">
      <div className="pointer-events-none absolute -top-16 right-0 left-0 h-14">
        <AnimatePresence mode="wait">
          <m.p
            key={turn}
            className="absolute bottom-0 -translate-x-1/2 rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 font-display text-lg whitespace-nowrap text-ink shadow-pop-sm after:absolute after:-bottom-[11px] after:left-6 after:size-4 after:rotate-45 after:border-r-[3px] after:border-b-[3px] after:border-ink after:bg-cream"
            style={{ left: `clamp(25%, ${(speaker + 0.5) * 25}%, 75%)` }}
            initial={{ opacity: 0, y: 12, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: -3 }}
            exit={{ opacity: 0, y: -8, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: turn === 0 ? 1.8 : 0 }}
          >
            {lines[turn]}
          </m.p>
        </AnimatePresence>
      </div>
      {suspects.map((s, i) => (
        <Character key={s.id} suspect={s} index={i} talking={i === speaker} />
      ))}
    </div>
  );
}
