"use client";

import { useEffect, useState } from "react";
import "./theatre.css";

/**
 * The moment between the lever and the film: a film-leader countdown on closed drapes,
 * then the drapes part on the case's opening. It lasts under three seconds and a tap skips it.
 */
export function CurtainUp({ onSkip }: { onSkip: () => void }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const tick = window.setInterval(() => setCount((c) => Math.max(1, c - 1)), 400);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <button type="button" onClick={onSkip} aria-label="Skip to the film" className="fixed inset-0 z-[75] block cursor-pointer overflow-hidden">
      <span aria-hidden className="drape drape-left absolute inset-y-0 left-0 w-1/2" />
      <span aria-hidden className="drape drape-right absolute inset-y-0 right-0 w-1/2" />
      <span aria-hidden className="absolute inset-x-0 top-0 h-6 bg-[#0d2f2e]" />
      <span
        aria-hidden
        className="leader-fade absolute top-1/2 left-1/2 grid size-36 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full border-4 border-cream/80 bg-black/55"
      >
        <span className="absolute inset-y-0 left-1/2 border-l-2 border-cream/40" />
        <span className="absolute inset-x-0 top-1/2 border-t-2 border-cream/40" />
        <span className="leader-sweep absolute top-0 left-1/2 -ml-px h-1/2 w-[3px] bg-mustard" />
        <span className="relative font-display text-6xl text-cream">{count}</span>
      </span>
    </button>
  );
}
