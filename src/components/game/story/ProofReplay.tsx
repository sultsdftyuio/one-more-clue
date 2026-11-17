"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView, ProofReplay as Replay, ReplayMoment } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { NARRATOR } from "@/lib/game/voice";
import { play } from "../audio/sound";
import { recordingOf, useVoice } from "../audio/voices";
import { carriesSound, nameOf } from "../context";
import { PIECE_ICON } from "../evidence/objects/FindingNote";
import { SceneThumb, ZoomedSpot } from "../evidence/SceneView";
import { usePrefersReducedMotion } from "../evidence/Viewfinder";
import { Icon } from "../ui/Icon";

/** How long between one moment dropping onto the night and the next. */
const STEP_MS = 800;

/** Who brought this piece to the table: the finder, the desk it came from, or nobody (it shows anyway, now it's proved). */
function creditOf(view: PlayerView, moment: ReplayMoment) {
  const you = (id: string) => id === view.me.id;
  if (moment.foundBy) return you(moment.foundBy) ? "You found it" : `${nameOf(view, moment.foundBy)} found it`;
  if (moment.holder) return you(moment.holder) ? "Your desk" : `${nameOf(view, moment.holder)}'s desk`;
  return "Nobody found it";
}

/** "8:40 PM" as the big "8:40" and the small "PM" under it. */
function TimeMark({ at }: { at: string }) {
  const [clock, half] = at.split(/\s+(?=[AP]M$)/i);
  return (
    <span className="block pt-1.5 text-right font-printer leading-none text-mustard">
      <span className="block text-2xl">{clock}</span>
      {half && <span className="block text-sm text-mustard/70">{half}</span>}
    </span>
  );
}

/** One moment on the night: its time, then the piece itself, as its words or its picture. */
function MomentRow({ view, moment, shown, reduced }: { view: PlayerView; moment: ReplayMoment; shown: boolean; reduced: boolean }) {
  const missed = !moment.foundBy && !moment.holder;
  const picture = moment.picture && (moment.picture.type === "scene" || moment.picture.type === "footage") ? moment.picture : null;
  return (
    <li
      aria-hidden={!shown}
      className={cx(
        "relative grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-5",
        shown ? "opacity-100" : "opacity-0",
        shown && !reduced && "animate-[rise-in_0.4s_ease-out]",
      )}
    >
      <TimeMark at={moment.at} />
      <span aria-hidden className={cx("absolute top-3 left-[4.12rem] size-3.5 rounded-full border-[3px] border-night", moment.proof ? "bg-coral" : "bg-mustard")} />
      <div
        className={cx(
          "relative rounded-xl border-[3px] bg-cream px-2.5 pt-2 pb-2 text-ink shadow-pop-sm",
          missed ? "border-dashed border-ink/50 bg-cream/85" : "border-ink",
          moment.proof && "ring-4 ring-coral",
        )}
      >
        <p className="flex items-start gap-1.5 pr-1 text-xs leading-tight font-extrabold text-ink/65">
          <Icon name={PIECE_ICON[moment.type] ?? "file"} className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1">{moment.title}</span>
          <span className={cx("shrink-0 rounded-full px-1.5 py-px text-[0.68rem]", missed ? "bg-ink/10 text-ink/60" : "bg-mustard/60 text-ink")}>{creditOf(view, moment)}</span>
        </p>
        {moment.crop ? (
          <span className="mt-1.5 block w-[min(8.5rem,62%)] -rotate-1 border-2 border-ink bg-white p-1">
            <ZoomedSpot scene={moment.crop.scene} hotspot={moment.crop.hotspot} />
          </span>
        ) : picture ? (
          <span className="mt-1.5 block w-[min(8.5rem,62%)]">
            <SceneThumb scene={picture} />
          </span>
        ) : (
          <p className="mt-1 font-typed text-[0.98rem] leading-snug break-words">&ldquo;{moment.quote}&rdquo;</p>
        )}
        {moment.by && <p className="mt-0.5 text-xs font-extrabold text-ink/55">{moment.by}</p>}
        {moment.proof && (
          <span className="absolute right-3 -bottom-3 rotate-2 rounded-md border-2 border-ink bg-coral px-1.5 text-[0.68rem] font-black tracking-wide text-cream uppercase">
            Your proof
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * A proved checkpoint, played back as the night: each moment the proof rests on drops onto a
 * timeline in order, credited to whoever turned it up, then the stamp comes down and one short
 * line closes it. Tap to show it all at once, tap again (or Skip) to move on. With reduced motion
 * it's all there from the start.
 */
export function ProofReplay({
  view,
  chapter,
  title,
  reveal,
  replay,
  onDone,
}: {
  view: PlayerView;
  chapter: number;
  title: string;
  reveal: string;
  replay: Replay;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const total = replay.moments.length;
  // 0..total moments shown, then one more step for the stamp and the closing line.
  const [step, setStep] = useState(0);
  const end = total + 1;
  const done = reduced || step >= end;
  const shownCount = done ? total : step;
  const list = useRef<HTMLOListElement>(null);
  const closing = useRef<HTMLDivElement>(null);
  const looseProof = replay.proof && !replay.moments.some((m) => m.proof) ? replay.proof : null;
  // The narrator closes it, once the stamp is down.
  useVoice(done && replay.say ? recordingOf(view.case.id, NARRATOR, replay.say) : null, carriesSound(view));

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 450 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, done]);

  // Each moment lands with a pin; the stamp with a stamp. The newest moment stays in view on short screens.
  useEffect(() => {
    if (reduced || step === 0) return;
    play(step > total ? "stamp" : "pin");
    const newest = step > total ? closing.current : list.current?.children[step - 1];
    newest?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step, total, reduced]);

  const next = useCallback(() => (done ? onDone() : setStep(end)), [done, end, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, onDone]);

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-night/95 backdrop-blur" role="dialog" aria-modal aria-label={`Chapter ${chapter} proved`}>
      <div className="relative flex items-center justify-between px-4 py-3">
        <p className="text-xs font-extrabold tracking-widest text-mustard uppercase">Chapter {chapter} · proved</p>
        <button type="button" onClick={onDone} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold text-cream/60 hover:bg-cream/10 hover:text-cream">
          Skip <Icon name="skip" className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" onClick={() => !done && setStep(end)}>
        <div className="mx-auto w-full max-w-md">
          <h2 className="font-display text-[1.7rem] leading-tight text-cream">{title}</h2>
          <p className="sr-only">{reveal}</p>
          <div className="relative mt-4">
            <span aria-hidden className="absolute top-2 bottom-2 left-[4.5rem] w-1 rounded-full bg-mustard/25" />
            <ol ref={list} className="relative space-y-3">
              {replay.moments.map((moment, i) => (
                <MomentRow key={`${moment.id}-${moment.at}`} view={view} moment={moment} shown={i < shownCount} reduced={reduced} />
              ))}
            </ol>
          </div>

          <div ref={closing} className={cx("mt-6 pb-2 text-center transition-opacity duration-300", done ? "opacity-100" : "opacity-0")} aria-hidden={!done}>
            {looseProof && (
              <p className="mb-2 text-sm font-extrabold text-cream/75">
                Proved with &ldquo;{looseProof.title}&rdquo;
              </p>
            )}
            <span className={cx("inline-block -rotate-6 rounded-xl border-4 border-coral px-4 font-display text-3xl tracking-wide text-coral", done && !reduced && "animate-stamp")}>Proved</span>
            {replay.say && <p className="mt-5 font-display text-[1.45rem] leading-tight text-balance text-cream">{replay.say}</p>}
            {replay.proof && <p className="mt-2 text-xs font-extrabold text-cream/55">Presented by {replay.proof.by === view.me.id ? "you" : nameOf(view, replay.proof.by)}</p>}
          </div>
        </div>
      </div>

      <div className="relative flex justify-center px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={next}
          className="rounded-full border-[3px] border-ink bg-mustard px-8 py-3 font-display text-xl text-ink shadow-pop transition-transform hover:-translate-y-0.5"
        >
          {done ? "Next" : "Show it all"}
        </button>
      </div>
    </div>
  );
}
