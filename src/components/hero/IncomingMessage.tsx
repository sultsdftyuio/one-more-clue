"use client";

import { useEffect, useState } from "react";

type Props = { from: string; time: string; text: string };

function TypingDots() {
  return (
    <span className="flex gap-1.5 py-2" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2.5 animate-typing rounded-full bg-cream"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/** The "contact" moment: a message from an unknown number types itself in. */
export function IncomingMessage({ from, time, text }: Props) {
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setTyping(false), reduce ? 0 : 1600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-md -rotate-1 animate-pop-in rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-coral font-display text-xl text-cream">
          ?
        </span>
        <p className="text-sm font-extrabold text-cream">
          {from} <span className="font-semibold text-cream/60">· {time}</span>
        </p>
        <span className="ml-auto size-3 rounded-full bg-mustard shadow-[0_0_0_4px_rgba(242,179,61,0.25)]" />
      </div>
      <div className="mt-3 rounded-2xl rounded-tl-sm border-[3px] border-ink bg-haze px-4 py-2" role="status">
        {typing ? <TypingDots /> : <p className="animate-pop-in leading-snug text-cream">{text}</p>}
      </div>
    </div>
  );
}
