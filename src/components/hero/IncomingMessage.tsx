"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { sfx } from "@/components/home/sound";

type Props = { from: string; time: string; text: string };

function TypingDots() {
  return (
    <span className="flex gap-1.5 py-2" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2.5 animate-typing rounded-full bg-cream" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/** The "contact" moment: a notification drops in, buzzes, and a message from an unknown number types itself in. */
export function IncomingMessage({ from, time, text }: Props) {
  const [typing, setTyping] = useState(true);
  const words = text.split(" ");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const buzz = window.setTimeout(sfx.buzz, 500);
    const timer = window.setTimeout(() => setTyping(false), reduce ? 0 : 1900);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(buzz);
    };
  }, []);

  return (
    <m.div
      className="w-full max-w-md"
      initial={{ opacity: 0, y: -40, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: -1 }}
      transition={{ type: "spring", stiffness: 200, damping: 16 }}
    >
      {/* The buzz: a quick shake, like a phone on a table. */}
      <m.div
        className="rounded-3xl border-[0.1875rem] border-ink bg-dusk p-4 shadow-card"
        animate={{ x: [0, -5, 5, -4, 4, -2, 2, 0], rotate: [0, -1, 1, -1, 1, 0] }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full border-[0.1875rem] border-ink bg-coral font-display text-xl text-cream">
            ?
            <m.span
              aria-hidden
              className="absolute inset-[-6px] rounded-full border-2 border-coral"
              animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          </span>
          <p className="text-sm font-extrabold text-cream">
            {from} <span className="font-semibold text-cream/60">· {time}</span>
          </p>
          <span className="ml-auto size-3 rounded-full bg-mustard shadow-[0_0_0_4px_rgba(242,179,61,0.25)]" />
        </div>
        <div className="mt-3 min-h-[3.25rem] rounded-2xl rounded-tl-sm border-[0.1875rem] border-ink bg-haze px-4 py-2" role="status">
          <AnimatePresence mode="wait" initial={false}>
            {typing ? (
              <m.div key="dots" exit={{ opacity: 0, scale: 0.8 }}>
                <TypingDots />
              </m.div>
            ) : (
              <p key="text" className="leading-snug text-cream">
                {words.map((word, i) => (
                  <m.span
                    key={i}
                    className="inline-block"
                    initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: i * 0.035, duration: 0.25 }}
                  >
                    {word}&nbsp;
                  </m.span>
                ))}
              </p>
            )}
          </AnimatePresence>
        </div>
      </m.div>
    </m.div>
  );
}
