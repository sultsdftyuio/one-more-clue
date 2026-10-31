"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { evidenceIn, useGame } from "./context";
import { InterrogationPanel } from "./Interrogation";
import { SuspectPortrait } from "./parts";
import { Icon } from "./ui/Icon";

const choice = (on: boolean) =>
  cx(
    "w-full rounded-2xl border-[3px] px-4 py-3 text-left font-bold transition-[transform,background-color] hover:-translate-y-0.5",
    on ? "border-ink bg-mustard text-ink shadow-pop-sm" : "border-cream/20 bg-night/40 text-cream hover:border-cream/60",
  );

const voteButton =
  "mt-4 w-full rounded-2xl border-[3px] border-ink bg-coral py-3 font-display text-xl text-cream shadow-pop transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-pop-sm disabled:opacity-50";

function Checkpoint() {
  const { view, act, busy } = useGame();
  const [picked, setPicked] = useState<string | null>(null);
  const checkpoint = view.chapter.checkpoint!;
  return (
    <div>
      <p className="mb-3 font-display text-2xl leading-tight text-cream">{checkpoint.question}</p>
      <div className="grid gap-2">
        {checkpoint.options.map((o) => (
          <button key={o.id} type="button" onClick={() => setPicked(o.id)} className={choice(picked === o.id)} aria-pressed={picked === o.id}>
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!picked || busy || Boolean(view.proposal)}
        onClick={async () => {
          if (picked && (await act({ type: "propose", kind: "answer", optionId: picked }))) setPicked(null);
        }}
        className={voteButton}
      >
        Put it to a vote
      </button>
      <p className="mt-2 text-center text-xs font-bold text-cream/55">
        The majority decides.{" "}
        {!view.deadline ? "A wrong answer counts against your stars." : view.deadline.left === 1 ? "One more wrong answer and the night is over." : "A wrong answer costs you hours."}
      </p>
    </div>
  );
}

function FinalReport() {
  const { view, act, busy } = useGame();
  const [suspect, setSuspect] = useState<string | null>(null);
  const [motive, setMotive] = useState<string | null>(null);
  const [proof, setProof] = useState<string[]>([]);
  const pinned = view.pins.flatMap((p) => {
    const e = evidenceIn(view, p.evidenceId);
    return e ? [e] : [];
  });
  const toggleProof = (id: string) => setProof((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length === 2 ? [p[1], id] : [...p, id]));
  const confronts = view.case.confrontation;
  const ready = suspect && motive && (confronts || proof.length === 2);

  return (
    <div className="grid gap-5">
      <div>
        <p className="font-display text-2xl leading-tight text-cream">{confronts ? "Name them" : "The final report"}</p>
        <p className="text-sm font-bold text-cream/65">
          {confronts
            ? "One shot, decided by majority. Name the wrong person and the case is over. Name the right one and you face them, with only what's on your board."
            : "Who did it, why, and two pinned pieces that prove it. One shot, decided by majority."}
        </p>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-extrabold tracking-widest text-mustard uppercase">1 · Who</legend>
        <div className="grid grid-cols-4 gap-2">
          {view.case.suspects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSuspect(s.id)}
              aria-pressed={suspect === s.id}
              className={cx(
                "rounded-2xl border-[3px] p-1.5 text-center transition-transform hover:-translate-y-0.5",
                suspect === s.id ? "border-ink bg-mustard text-ink shadow-pop-sm" : "border-cream/20 bg-cream/90 text-ink",
              )}
            >
              <SuspectPortrait suspect={s} shocked={suspect === s.id} className="mx-auto w-full max-w-16" />
              <span className="block text-xs leading-tight font-extrabold">{s.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-extrabold tracking-widest text-mustard uppercase">2 · Why</legend>
        <div className="grid gap-2">
          {view.case.motives.map((m) => (
            <button key={m.id} type="button" onClick={() => setMotive(m.id)} className={choice(motive === m.id)} aria-pressed={motive === m.id}>
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      {!confronts && (
        <fieldset className="min-w-0">
          <legend className="mb-2 text-xs font-extrabold tracking-widest text-mustard uppercase">3 · Proof ({proof.length}/2 from the board)</legend>
          {pinned.length ? (
            <div className="grid gap-2">
              {pinned.map((e) => (
                <button key={e.id} type="button" onClick={() => toggleProof(e.id)} className={choice(proof.includes(e.id))} aria-pressed={proof.includes(e.id)}>
                  <span className="flex items-center gap-2">
                    <Icon name={proof.includes(e.id) ? "check" : "pin"} className="size-4" />
                    {e.title}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="font-bold text-cream/60">Pin your strongest evidence to the board first.</p>
          )}
        </fieldset>
      )}

      <button
        type="button"
        disabled={!ready || busy || Boolean(view.proposal)}
        onClick={async () => {
          if (!ready || !suspect || !motive) return;
          await act({ type: "propose", kind: "final", report: { suspectId: suspect, motiveId: motive, evidenceIds: proof } });
        }}
        className={voteButton}
      >
        {confronts ? "Put your accusation to a vote" : "Put the report to a vote"}
      </button>
    </div>
  );
}

function Hints() {
  const { view, act, busy } = useGame();
  const [givingUp, setGivingUp] = useState(false);
  const left = view.chapter.hintsTotal - view.chapter.hints.length;
  const voting = Boolean(view.proposal);
  return (
    <section className="rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-xl text-cream">
        <Icon name="bulb" /> Hints
      </h3>
      {view.chapter.hints.length > 0 && (
        <ol className="mb-4 grid gap-2">
          {view.chapter.hints.map((hint, i) => (
            <li key={i} className="rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink">
              <span className="mr-2 font-display text-coral">#{i + 1}</span>
              {hint}
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        disabled={voting || busy || left === 0}
        onClick={() => act({ type: "propose", kind: "hint" })}
        className="w-full rounded-2xl border-[3px] border-ink bg-cream py-2.5 font-display text-lg text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {left ? `Ask the group for a hint (${left} left)` : "No hints left in this chapter"}
      </button>
      <p className="mt-2 text-center text-xs font-bold text-cream/55">
        {view.hintsUsed === 0 ? "Your first hint is free. After that, hints cost a star." : `Hints used: ${view.hintsUsed}. More than one costs a star.`}
      </p>
      <div className="mt-4 border-t-2 border-cream/10 pt-3 text-center">
        {givingUp ? (
          <span className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-cream">
            End the case and see the answer?
            <button type="button" disabled={voting} className="font-extrabold text-coral hover:underline" onClick={async () => (await act({ type: "propose", kind: "giveUp" })) && setGivingUp(false)}>
              Vote to give up
            </button>
            <button type="button" className="font-extrabold text-cream/60 hover:underline" onClick={() => setGivingUp(false)}>
              Keep going
            </button>
          </span>
        ) : (
          <button type="button" disabled={voting} onClick={() => setGivingUp(true)} className="text-sm font-extrabold text-cream/45 hover:text-coral disabled:opacity-50">
            We give up
          </button>
        )}
      </div>
    </section>
  );
}

export function SolvePanel() {
  const { view } = useGame();
  return (
    <div className="grid gap-5">
      {view.interrogation ? (
        <InterrogationPanel />
      ) : (
        <section className="rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card sm:p-5">
          <p className="text-xs font-extrabold tracking-widest text-mustard uppercase">
            Chapter {view.chapter.number} of {view.case.chapterTitles.length} · {view.chapter.title}
          </p>
          <p className="mt-1 mb-5 font-semibold text-cream/80">{view.chapter.intro}</p>
          {view.chapter.checkpoint ? <Checkpoint /> : <FinalReport />}
        </section>
      )}

      {view.solved.length > 0 && (
        <section className="grid gap-2">
          {[...view.solved].reverse().map((s) => (
            <div key={s.number} className="rounded-2xl border-2 border-teal/50 bg-teal/10 p-3">
              <p className="flex items-center gap-2 text-sm font-extrabold text-teal">
                <Icon name="check" className="size-4" /> Chapter {s.number} · {s.question}
              </p>
              <p className="mt-1 text-sm font-semibold text-cream/80">{s.reveal}</p>
            </div>
          ))}
        </section>
      )}

      <Hints />
    </div>
  );
}
