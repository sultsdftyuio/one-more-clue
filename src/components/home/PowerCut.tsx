"use client";

import { AnimatePresence, m } from "motion/react";
import { useBlackout } from "./blackout";

/** 9:17: the power cuts out for a beat and emergency lights blink red, over whatever is on screen. */
export function PowerCut() {
  const { phase } = useBlackout();
  return (
    <AnimatePresence>
      {phase === "dark" && (
        <m.div key="cut" aria-hidden className="pointer-events-none fixed inset-0 z-[55]">
          <m.div
            className="absolute inset-0 bg-[#05060f]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.92, 0.25, 0.88, 0.5, 0] }}
            transition={{ duration: 1, times: [0, 0.12, 0.3, 0.45, 0.7, 1] }}
          />
          <m.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,91,91,0.55),rgba(239,91,91,0)_60%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.2, 0.9, 0] }}
            transition={{ duration: 1.6, delay: 0.75, times: [0, 0.2, 0.45, 0.65, 1] }}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
