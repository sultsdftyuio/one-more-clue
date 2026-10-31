"use client";

import Image from "next/image";
import { useState } from "react";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { useGame } from "../../context";
import { SuspectPortrait } from "../../parts";
import { Icon } from "../../ui/Icon";

/** The Interviewer sits in the recording room: one tape per question, and a face to ask. */
export function InterviewerTool() {
  const { view, act, busy, open } = useGame();
  const [armed, setArmed] = useState<string | null>(null);
  const questions = view.questions ?? [];
  const left = view.questionsLeft;
  const bySuspect = questions.reduce<Record<string, typeof questions>>((acc, q) => ({ ...acc, [q.suspect]: [...(acc[q.suspect] ?? []), q] }), {});

  return (
    <section className="tool-tape rounded-3xl border-[3px] border-ink p-4 text-cream shadow-pop sm:p-5">
      <header className="mb-1 flex items-center gap-2.5">
        <Image src={propArt.question} alt="" sizes="56px" className="w-10 -rotate-6" />
        <h3 className="flex-1 font-display text-2xl leading-tight">Interview room</h3>
        <span className="flex items-center gap-1.5 rounded-md bg-coral px-2 py-0.5 text-xs font-black tracking-widest text-cream">
          <span className="size-2 animate-pulse rounded-full bg-cream" /> REC
        </span>
      </header>
      <p className="mb-4 text-sm leading-snug font-semibold text-cream/70">The whole team shares these tapes. Agree before you spend one. Following up a lead is free.</p>
      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-black/25 p-2.5" aria-label={`${left} of ${view.case.questionBudget} questions left`}>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {Array.from({ length: view.case.questionBudget }, (_, i) => (
            <span key={i} className={cx("tape-reel size-6 rounded-full border-2", i < left ? "border-lilac text-lilac" : "border-cream/15 text-cream/15")} />
          ))}
        </div>
        <span className="text-sm font-extrabold whitespace-nowrap">{left} left</span>
      </div>
      <div className="space-y-5">
        {Object.entries(bySuspect).map(([name, list]) => {
          const suspect = view.case.suspects.find((s) => s.name === name);
          return (
            <div key={name}>
              <div className="mb-2 flex items-center gap-2.5">
                {suspect ? (
                  <SuspectPortrait suspect={suspect} className="h-12 w-auto shrink-0" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lilac font-display text-lg text-ink">{name[0]}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg leading-tight">{name}</span>
                  {suspect?.role && <span className="block truncate text-xs font-bold text-cream/55">{suspect.role}</span>}
                </span>
              </div>
              <ul className="space-y-2">
                {list.map((q) => (
                  <li key={q.id}>
                    {q.asked ? (
                      <button
                        type="button"
                        onClick={() => open(q.id)}
                        className="flex w-full items-center gap-2 rounded-2xl rounded-tl-md bg-cream/10 px-3 py-2 text-left font-semibold text-cream/65"
                      >
                        <Icon name="check" className="size-4 text-teal" />
                        <span className="flex-1">{q.question}</span>
                        <span className="text-xs font-extrabold text-lilac">Play back</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || (left === 0 && !q.lead)}
                        onClick={async () => {
                          if (armed !== q.id) return setArmed(q.id);
                          setArmed(null);
                          await act({ type: "ask", evidenceId: q.id });
                        }}
                        onBlur={() => setArmed((a) => (a === q.id ? null : a))}
                        className={cx(
                          "flex w-full items-center gap-2 rounded-2xl rounded-tl-md border-[3px] px-3 py-2 text-left font-bold transition-colors disabled:opacity-50",
                          armed === q.id ? "border-ink bg-coral text-cream" : "border-ink bg-cream text-ink hover:bg-lilac",
                        )}
                      >
                        <span className="flex-1">{q.question}</span>
                        <span className="shrink-0 text-xs font-extrabold">{armed === q.id ? (q.lead ? "Tap to ask (free)" : "Tap to ask (uses 1)") : q.lead ? "Lead" : "Ask"}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
