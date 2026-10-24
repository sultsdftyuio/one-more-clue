"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Beat, CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";
import { SuspectPortrait } from "../parts";
import { Icon } from "../ui/Icon";

const TYPE_MS = 22;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reveals `text` a letter at a time, ticking like a typewriter. `done` finishes it at once. */
export function useTypewriter(text: string, enabled = true) {
  const [shown, setShown] = useState(enabled && !reducedMotion() ? 0 : text.length);
  const finished = useRef(false);
  useEffect(() => {
    finished.current = false;
    if (!enabled || reducedMotion()) {
      setShown(text.length);
      return;
    }
    let n = 0;
    setShown(0);
    const timer = window.setInterval(() => {
      if (finished.current || n >= text.length) return window.clearInterval(timer);
      if (text[n] !== " ") play("type");
      n++;
      setShown(n);
    }, TYPE_MS);
    return () => window.clearInterval(timer);
  }, [enabled, text]);
  const finish = () => {
    finished.current = true;
    setShown(text.length);
  };
  return { text: text.slice(0, shown), complete: shown >= text.length, finish };
}

function BeatView({ beat, suspects, typed }: { beat: Beat; suspects: CaseSuspect[]; typed: string }) {
  if (beat.kind === "title") {
    return (
      <div className="text-center">
        <p className="mx-auto inline-block max-w-[85vw] -rotate-3 animate-stamp rounded-2xl border-4 border-mustard px-4 py-1.5 font-display text-[clamp(1.6rem,8vw,3.75rem)] leading-tight text-mustard uppercase">
          {beat.text}
        </p>
        {beat.sub && <p className="mt-8 animate-pop-in font-display text-2xl text-cream [animation-delay:0.3s] sm:text-3xl">{beat.sub}</p>}
      </div>
    );
  }
  if (beat.kind === "narration") {
    return (
      <p className="mx-auto max-w-lg rounded-2xl border-[3px] border-ink bg-cream px-5 py-4 text-left text-lg leading-relaxed font-bold text-ink shadow-card sm:text-xl">
        {typed}
        <span className="ml-0.5 inline-block h-5 w-2 animate-pulse bg-ink/60 align-middle" />
      </p>
    );
  }
  if (beat.kind === "message") {
    return (
      <div className="mx-auto w-full max-w-sm rounded-[2rem] border-[3px] border-ink bg-ink p-3 shadow-card">
        <div className="rounded-[1.5rem] bg-dusk p-4">
          <p className="mb-3 text-center text-xs font-extrabold tracking-widest text-cream/50 uppercase">{beat.time ?? "Now"}</p>
          <div className="animate-[sheet-up_0.35s_ease-out] rounded-2xl rounded-tl-md bg-cream px-4 py-3 text-ink">
            <p className="text-xs font-extrabold text-coral-dk">{beat.from}</p>
            <p className="text-lg leading-snug font-bold">{beat.text}</p>
            {beat.edited && <p className="mt-1 text-right text-xs font-extrabold text-ink/50 italic">edited</p>}
          </div>
        </div>
      </div>
    );
  }
  const suspect = suspects.find((s) => s.id === beat.who);
  return (
    <div className="mx-auto flex w-full max-w-lg items-end gap-3">
      {suspect ? (
        <SuspectPortrait suspect={suspect} shocked={beat.shocked} className="w-24 shrink-0 animate-pop-in sm:w-32" />
      ) : (
        <span className="grid size-20 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-lilac font-display text-3xl text-ink">
          {beat.who[0]}
        </span>
      )}
      <div className="relative mb-6 flex-1 rounded-3xl rounded-bl-md border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-card">
        <p className="text-xs font-extrabold tracking-wide text-ink/50 uppercase">{suspect?.name ?? beat.who}</p>
        <p className="text-lg leading-snug font-bold sm:text-xl">{typed}</p>
      </div>
    </div>
  );
}

const SOUND: Record<Beat["kind"], "stamp" | "message" | "tap" | null> = { title: "stamp", message: "message", narration: null, line: null };

/**
 * Plays a story as a sequence of pop-ups. Tap (or Enter/Space/→) to finish the
 * line or move on; Skip ends it. Used for the briefing, each new chapter and
 * the culprit's confession.
 */
export function StoryPlayer({ beats, suspects, onDone, finishLabel = "Let's go" }: { beats: Beat[]; suspects: CaseSuspect[]; onDone: () => void; finishLabel?: string }) {
  const [index, setIndex] = useState(0);
  const beat = beats[index];
  const typing = beat && (beat.kind === "narration" || beat.kind === "line");
  const typed = useTypewriter(beat?.text ?? "", Boolean(typing));
  const last = index >= beats.length - 1;

  useEffect(() => {
    const sound = beat && SOUND[beat.kind];
    if (sound) play(sound);
  }, [beat]);

  const next = useCallback(() => {
    if (typing && !typed.complete) return typed.finish();
    if (last) return onDone();
    setIndex((i) => i + 1);
  }, [last, onDone, typed, typing]);

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

  if (!beat) return null;

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-night/95 backdrop-blur" role="dialog" aria-modal aria-label="Story">
      <div className="flex items-center justify-between px-4 py-3">
        <ol className="flex gap-1.5" aria-label={`${index + 1} of ${beats.length}`}>
          {beats.map((_, i) => (
            <li key={i} className={cx("h-1.5 w-6 rounded-full transition-colors", i <= index ? "bg-mustard" : "bg-cream/20")} />
          ))}
        </ol>
        <button type="button" onClick={onDone} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold text-cream/60 hover:bg-cream/10 hover:text-cream">
          Skip <Icon name="skip" className="size-4" />
        </button>
      </div>

      <button type="button" onClick={next} className="flex flex-1 cursor-pointer items-center justify-center px-4 pb-6" aria-label={last && (!typing || typed.complete) ? finishLabel : "Next"}>
        <div key={index} className="w-full animate-[curtain_0.35s_ease-out]">
          <BeatView beat={beat} suspects={suspects} typed={typed.text} />
        </div>
      </button>

      <div className="flex justify-center px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={next}
          className="rounded-full border-[3px] border-ink bg-mustard px-8 py-3 font-display text-xl text-ink shadow-pop transition-transform hover:-translate-y-0.5"
        >
          {last && (!typing || typed.complete) ? finishLabel : "Next"}
        </button>
      </div>
    </div>
  );
}
