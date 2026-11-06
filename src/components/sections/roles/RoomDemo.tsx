"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { sfx } from "@/components/home/sound";
import { rolesDemo } from "@/data/roles";
import { suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { Cost, Handoff, Note } from "./shared";

/** Types an answer out a few letters at a time, with a voice blip every few. */
function useTyped(text: string, on: boolean) {
  const [shown, setShown] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 2;
      if (i % 6 === 0 && text[i] !== " ") sfx.blip();
      setShown(Math.min(i, text.length));
      if (i >= text.length) window.clearInterval(id);
    }, 32);
    return () => window.clearInterval(id);
  }, [text, on]);
  return text.slice(0, shown);
}

/**
 * Interviewer: the interrogation room. A lamp over the table, the suspect in
 * the chair and a question card to play. The answer types out in the
 * suspect's voice and hands the Tech a lead. "Show them" is the side action:
 * slap something from the board down, and if it breaks their story, they crack.
 */
export function RoomDemo({ asked, onAsk, next }: { asked: boolean; onAsk: () => void; next: () => void }) {
  const { suspect, name, question, answer, lead } = rolesDemo.interview;
  const [justAsked, setJustAsked] = useState(false);
  const [showing, setShowing] = useState(false);
  const typed = useTyped(answer, justAsked);
  const done = typed.length >= answer.length;

  return (
    <div>
      {/* The room: one lamp, one chair, one table. */}
      <div className="relative overflow-hidden rounded-[1.6rem] border-[0.1875rem] border-ink bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,214,140,0.38),transparent_62%),linear-gradient(#262038,#141022)] px-4 pt-4 shadow-pop-sm">
        <span aria-hidden className="absolute top-0 left-1/2 h-3 w-24 -translate-x-1/2 rounded-b-full bg-[#4b4060] shadow-[0_6px_18px_rgba(255,214,140,0.6)]" />
        <div className="relative flex items-end gap-3 sm:gap-5">
          <m.div className="w-24 shrink-0 sm:w-32" animate={asked ? { rotate: [0, -1.5, 1.5, 0] } : {}} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <Image src={suspectArt[suspect].idle} alt={`${name}, in the chair`} sizes="128px" className="w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]" />
          </m.div>
          <div className="mb-5 min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {asked ? (
                <m.p
                  key="answer"
                  className="relative rounded-2xl rounded-bl-sm border-[0.1875rem] border-ink bg-cream px-4 py-2.5 font-semibold text-ink"
                  initial={{ opacity: 0, scale: 0.9, x: -12 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                >
                  <span className="block text-xs font-extrabold tracking-widest text-ink/55 uppercase">{name}</span>
                  {typed}
                  {!done && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ink/60 align-middle" />}
                  <span className="sr-only">{answer}</span>
                </m.p>
              ) : (
                <m.p key="waiting" className="text-sm font-bold text-cream/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {name} sits down, arms folded. Play a question card.
                </m.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* The table edge, with the question card on it. */}
        <div className="relative -mx-4 border-t-[0.1875rem] border-ink bg-[linear-gradient(#5b4330,#3d2c20)] px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={asked}
              onClick={() => {
                setJustAsked(true);
                onAsk();
              }}
              className={cx(
                "min-w-0 flex-1 -rotate-1 rounded-xl border-[0.1875rem] border-ink bg-lilac px-4 py-2.5 text-left font-bold text-ink shadow-pop-sm transition-transform",
                asked ? "translate-y-1 opacity-60" : "hover:-translate-y-1 hover:rotate-0",
              )}
            >
              <span className="block text-xs font-extrabold tracking-widest text-ink/60 uppercase">{asked ? "Asked" : "Ask"}</span>
              {question}
            </button>
            <button
              type="button"
              onClick={() => setShowing((s) => !s)}
              aria-expanded={showing}
              className="rounded-full border-2 border-cream/50 px-3.5 py-2 text-sm font-extrabold text-cream transition-colors hover:border-cream"
            >
              Show them
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showing && (
          <Note key="show" tone="text-cream/85">
            Show a suspect something from the board. If it breaks what they said, they crack and give something up. Nothing here breaks {name}&rsquo;s story, so he just shrugs.
          </Note>
        )}
      </AnimatePresence>
      <Cost>In the game, a question costs a little of the night. One a lead points you to is free.</Cost>

      {asked && done && (
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="mt-5 inline-block -rotate-1 rounded-xl border-[0.1875rem] border-ink bg-teal px-4 py-2 font-bold text-ink shadow-pop-sm">New lead for the Tech: {lead}</p>
          <div>
            <Handoff to="tech" onClick={next}>
              Pass it to the Tech
            </Handoff>
          </div>
        </m.div>
      )}
    </div>
  );
}
