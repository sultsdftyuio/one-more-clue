"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";
import { onTapsUntil } from "@/lib/audio-unlock";
import { onSoundChange, rememberedSound, setSoundEnabled, soundRunning } from "./sound";

/**
 * Rain and the blackout's sounds. Off by default; if the visitor turned it on
 * last time, it comes back with their first tap (browsers need one).
 */
export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => onSoundChange(setOn), []);
  useEffect(() => {
    if (!rememberedSound()) return;
    return onTapsUntil(() => {
      setSoundEnabled(true);
      return soundRunning();
    });
  }, []);

  return (
    <m.button
      type="button"
      onClick={() => setSoundEnabled(!on)}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full border-[0.1875rem] border-ink bg-night/85 px-3 py-2 text-sm font-extrabold text-cream shadow-pop-sm backdrop-blur"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2.4, type: "spring", stiffness: 260, damping: 18 }}
      whileTap={{ scale: 0.92 }}
    >
      <span aria-hidden className="flex h-4 items-end gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <m.span
            key={i}
            className="w-1 rounded-full bg-mustard"
            animate={on ? { height: ["30%", "100%", "45%", "80%", "30%"] } : { height: "30%" }}
            transition={on ? { duration: 1.1, repeat: Infinity, delay: i * 0.15 } : { duration: 0.2 }}
          />
        ))}
      </span>
      <span className="hidden sm:inline">{on ? "Sound on" : "Sound off"}</span>
    </m.button>
  );
}
