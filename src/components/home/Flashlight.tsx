"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBlackout } from "./blackout";

/**
 * During the blackout, the screen goes dark except for a flashlight beam: it
 * follows the mouse on desktop, and sits mid-screen on phones so scrolling
 * sweeps the evidence through it. Anyone can switch it off.
 */
export function Flashlight() {
  const { phase, inCase } = useBlackout();
  const [off, setOff] = useState(false);
  const [hint, setHint] = useState(false);
  const [touch, setTouch] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const active = phase === "dark" && inCase && !off;

  useEffect(() => {
    setTouch(!window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!active || touch) return;
    const move = (e: PointerEvent) => {
      layer.current?.style.setProperty("--fx", `${e.clientX}px`);
      layer.current?.style.setProperty("--fy", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [active, touch]);

  // A short "lights out" hint the first time it gets dark.
  useEffect(() => {
    if (!active) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 3800);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <m.div
          key="dark"
          ref={layer}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 [--fx:50vw] [--fy:45vh] [--r:min(46vmax,330px)] pointer-fine:[--r:clamp(170px,22vmax,280px)]"
          style={{
            background:
              "radial-gradient(circle var(--r) at var(--fx) var(--fy), rgba(255,230,167,0.10), rgba(255,230,167,0.04) 45%, rgba(5,6,16,0.45) 72%, rgba(5,6,16,0.86) 100%)",
          }}
          initial={{ opacity: 0 }}
          // Lights don't just fade: they stutter out.
          animate={{ opacity: [0, 1, 0.3, 1, 0.7, 1] }}
          exit={{ opacity: [1, 0.2, 0.9, 0], transition: { duration: 0.8 } }}
          transition={{ duration: 0.9, times: [0, 0.2, 0.35, 0.55, 0.7, 1] }}
        />
      )}
      {active && hint && (
        <m.p
          key="hint"
          role="status"
          className="fixed top-24 left-1/2 z-50 -translate-x-1/2 rounded-full border-[3px] border-ink bg-cream px-4 py-2 text-center text-sm font-extrabold whitespace-nowrap text-ink shadow-pop-sm"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
        >
          🔦 Lights out. {touch ? "Scroll the beam over the evidence." : "Use your flashlight."}
        </m.p>
      )}
      {phase === "dark" && inCase && (
        <m.button
          key="switch"
          type="button"
          onClick={() => setOff((v) => !v)}
          aria-label={off ? "Turn the flashlight back on" : "Too dark? Turn the flashlight off"}
          className="fixed bottom-4 left-4 z-50 rounded-full border-[3px] border-ink bg-cream px-4 py-2 text-sm font-extrabold text-ink shadow-pop-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {off ? "🔦 Flashlight" : "💡 Too dark?"}
        </m.button>
      )}
    </AnimatePresence>
  );
}
