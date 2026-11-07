"use client";

import Image from "next/image";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Alibi } from "@/data/mini-case";
import { suspectById, type SuspectId } from "@/data/suspects";
import { sceneArt, suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import type { Verdict } from "./useMiniCase";

type Props = {
  alibis: Alibi[];
  verdicts: Partial<Record<SuspectId, Verdict>>;
  locked: boolean;
  justCleared: SuspectId | null;
  onAccuse: (id: SuspectId) => void;
};

const stamps: Record<Verdict, string> = {
  cleared: "border-teal text-teal",
  busted: "border-coral text-coral",
};

/**
 * The warm-up's four suspects, standing on the street at 9:17. Tap one and
 * their alibi comes up in a speech bubble pointing at them, with the button
 * to accuse them. A "?" marks anyone you haven't heard from yet.
 */
export function SuspectScene({ alibis, verdicts, locked, justCleared, onAccuse }: Props) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<SuspectId>(alibis[0].suspect);
  const [heard, setHeard] = useState<ReadonlySet<SuspectId>>(() => new Set([alibis[0].suspect]));
  const pick = (id: SuspectId) => {
    setPicked(id);
    setHeard((h) => new Set(h).add(id));
  };

  const index = alibis.findIndex((a) => a.suspect === picked);
  const alibi = alibis[index];
  const suspect = suspectById(picked);
  const verdict = verdicts[picked];

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border-[0.1875rem] border-ink bg-[linear-gradient(180deg,#151935_0%,#232857_70%,#2d3266_100%)] shadow-card">
      {/* The block behind them, lights out. */}
      <Image src={sceneArt.cityBackDark} alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="-z-10 object-cover object-bottom opacity-45" />

      <div className="px-3 pt-4 sm:px-6 sm:pt-6">
        {/* The speech bubble: whoever you picked, telling you where they were. */}
        <div aria-live="polite" className="relative min-h-[11.5rem] sm:min-h-[10rem]">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={`${picked}-${verdict ?? "open"}`}
              className="relative rounded-2xl border-[0.1875rem] border-ink bg-cream p-4 text-ink shadow-pop sm:p-5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xl leading-none sm:text-2xl">{suspect.name}</span>
                <span className={cx("rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold", suspect.accent)}>{suspect.trait}</span>
              </p>
              <p className="mt-2 text-sm leading-snug font-semibold sm:text-base">“{alibi.claim}”</p>
              {verdict && (
                <p className={cx("mt-2 text-sm leading-snug font-extrabold sm:text-base", verdict === "busted" ? "text-coral-dk" : "text-[#1d7a73]")}>“{alibi.reaction}”</p>
              )}
              <Button
                variant="coral"
                className="mt-3 max-sm:px-4 max-sm:py-2 max-sm:text-base"
                disabled={locked || !!verdict}
                onClick={() => onAccuse(picked)}
              >
                {verdict === "busted" ? "Caught!" : verdict === "cleared" ? "Not them" : `Accuse ${suspect.name}`}
              </Button>
              {/* The tail points down at the one talking. */}
              <span
                aria-hidden
                className="absolute -bottom-[0.72rem] size-5 rotate-45 border-r-[0.1875rem] border-b-[0.1875rem] border-ink bg-cream transition-[left] duration-200"
                style={{ left: `calc(${(index + 0.5) * (100 / alibis.length)}% - 0.625rem)` }}
              />
            </m.div>
          </AnimatePresence>
        </div>

        {/* The lineup, standing on the street. */}
        <ul className="mt-4 grid grid-cols-4 items-end gap-1 sm:gap-4">
          {alibis.map((a) => {
            const s = suspectById(a.suspect);
            const v = verdicts[a.suspect];
            const on = a.suspect === picked;
            const art = suspectArt[a.suspect];
            return (
              <li key={a.suspect}>
                <button
                  type="button"
                  onClick={() => pick(a.suspect)}
                  aria-pressed={on}
                  aria-label={`${s.name}: hear their alibi${v ? ` (${v})` : ""}`}
                  className="group relative flex w-full flex-col items-center rounded-2xl pt-3 pb-1 focus-visible:outline-4 focus-visible:outline-mustard"
                >
                  {!heard.has(a.suspect) && !v && (
                    <span aria-hidden className="absolute top-0 right-[12%] z-10 grid size-6 animate-bounce place-items-center rounded-full border-2 border-ink bg-mustard font-display text-sm text-ink motion-reduce:animate-none">
                      ?
                    </span>
                  )}
                  <m.span
                    className={cx("relative block w-full max-w-[7.5rem]", justCleared === a.suspect && "animate-shake")}
                    animate={on && !reduce ? { y: -6, scale: 1.06 } : { y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    style={{ transformOrigin: "50% 100%" }}
                  >
                    <Image src={v ? art.shocked : art.idle} alt="" sizes="(min-width: 640px) 120px, 22vw" className={cx("w-full transition-opacity", v === "cleared" && "opacity-55")} />
                    {v && (
                      <span
                        className={cx(
                          "absolute top-1/3 left-1/2 -translate-x-1/2 animate-stamp rounded-lg border-[0.1875rem] bg-night/85 px-1.5 font-display text-sm tracking-wider uppercase sm:border-4 sm:px-2 sm:text-xl",
                          stamps[v],
                        )}
                      >
                        {v}
                      </span>
                    )}
                  </m.span>
                  <span
                    className={cx(
                      "mt-1 rounded-full px-2 py-0.5 text-center text-xs leading-tight font-extrabold transition-colors sm:text-sm",
                      on ? "bg-cream text-ink" : "text-cream/75 group-hover:text-cream",
                    )}
                  >
                    {s.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {/* The pavement they're standing on. */}
      <div aria-hidden className="h-5 border-t-[0.1875rem] border-ink bg-[#3a3f73] sm:h-6" />
    </div>
  );
}
