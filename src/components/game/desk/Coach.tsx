"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";

/** The gesture a step teaches, drawn as touch points: no hands. */
export type Gesture = "tap" | "pinch" | "drag" | "shake" | "type" | "hold" | "look";

export type CoachStep = {
  /** The `data-coach` name of the control to light up. Without one, the step sits in the middle. */
  target?: string;
  title: string;
  text: ReactNode;
  gesture: Gesture;
  /** A button that does something real from inside the step, such as asking to use the phone's motion. */
  action?: { label: string; run: () => void | Promise<void> };
};

const seenKey = (role: string) => `omc-coach-${role}-v1`;

/**
 * Whether this device still needs a role's tutorial. It shows the first time
 * a station opens, and the station's ? button brings it back.
 */
export function useCoach(role: string) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(seenKey(role))) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [role]);
  const close = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(seenKey(role), "1");
    } catch {}
  }, [role]);
  const show = useCallback(() => setOpen(true), []);
  return { open, show, close };
}

type Hole = { left: number; top: number; width: number; height: number };

/** Where a control sits on screen, with a little room around it. */
function holeAround(name: string): Hole | null {
  const el = document.querySelector<HTMLElement>(`[data-coach="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const pad = 8;
  return { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

/**
 * A short guided tour over a station: one control at a time, lit up, with one
 * sentence and a drawing of the gesture. The page stays live underneath, so a
 * step can say "try it" and mean it. Three steps at most.
 */
export function Coach({ steps, onClose, label }: { steps: CoachStep[]; onClose: () => void; label: string }) {
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const [hole, setHole] = useState<Hole | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const last = index >= steps.length - 1;

  // Bring the control into view, then keep the light on it as the page moves.
  useLayoutEffect(() => {
    if (!step.target) {
      setHole(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-coach="${step.target}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHole(holeAround(step.target!)));
    };
    measure();
    const settle = window.setTimeout(measure, 420);
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [step.target]);

  useEffect(() => {
    play("message");
    next.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The card sits on the other half of the screen from the control it points at.
  const below = !hole || hole.top + hole.height / 2 < window.innerHeight / 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal="false" aria-label={label}>
      {hole ? (
        <div
          aria-hidden
          className="coach-hole absolute rounded-2xl transition-all duration-300 ease-out"
          style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-night/75" />
      )}

      <div
        className={cx(
          "pointer-events-auto absolute inset-x-3 mx-auto max-w-sm animate-[rise-in_0.3s_ease-out] rounded-3xl border-[3px] border-ink bg-cream p-4 text-ink shadow-card",
          !hole ? "top-1/2 -translate-y-1/2" : below ? "bottom-[calc(1rem+env(safe-area-inset-bottom))]" : "top-[calc(1rem+env(safe-area-inset-top))]",
        )}
      >
        <div className="flex items-start gap-3">
          <GestureDemo gesture={step.gesture} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-extrabold tracking-widest text-ink/50 uppercase">
              {label} · {index + 1} of {steps.length}
            </p>
            <p className="font-display text-xl leading-tight">{step.title}</p>
            <p className="mt-1 text-sm leading-snug font-semibold text-ink/80">{step.text}</p>
          </div>
        </div>
        {step.action && (
          <button
            type="button"
            onClick={() => void step.action!.run()}
            className="mt-3 w-full rounded-xl border-[3px] border-ink bg-mustard py-2 font-extrabold shadow-pop-sm transition-transform hover:-translate-y-0.5"
          >
            {step.action.label}
          </button>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm font-extrabold text-ink/55 hover:text-ink">
            Skip
          </button>
          <span className="flex flex-1 justify-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className={cx("size-2 rounded-full", i === index ? "bg-ink" : "bg-ink/20")} />
            ))}
          </span>
          {index > 0 && (
            <button type="button" onClick={() => setIndex((i) => i - 1)} className="rounded-full border-2 border-ink px-3 py-1.5 text-sm font-extrabold">
              Back
            </button>
          )}
          <button
            ref={next}
            type="button"
            onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
            className="rounded-full border-[3px] border-ink bg-coral px-4 py-1.5 text-sm font-extrabold text-cream shadow-pop-sm"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The gesture, drawn as touch points and arrows on a little phone screen. */
function GestureDemo({ gesture }: { gesture: Gesture }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="size-16 shrink-0 rounded-2xl border-[3px] border-ink bg-night text-mustard">
      {gesture === "tap" && (
        <>
          <circle cx="32" cy="32" r="7" fill="currentColor" className="coach-tap-dot" />
          <circle cx="32" cy="32" r="7" fill="none" stroke="currentColor" strokeWidth="3" className="coach-tap-ring" />
        </>
      )}
      {gesture === "hold" && (
        <>
          <circle cx="32" cy="32" r="7" fill="currentColor" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="95" className="coach-hold-ring" />
        </>
      )}
      {gesture === "pinch" && (
        <>
          <path d="M20 44 44 20" stroke="currentColor" strokeOpacity=".3" strokeWidth="2" strokeDasharray="3 4" />
          <circle cx="32" cy="32" r="6" fill="currentColor" className="coach-pinch-a" />
          <circle cx="32" cy="32" r="6" fill="currentColor" className="coach-pinch-b" />
        </>
      )}
      {gesture === "drag" && (
        <>
          <path d="M14 40 C24 22 40 22 50 34" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="0" r="6" fill="currentColor" className="coach-drag-dot" />
        </>
      )}
      {gesture === "shake" && (
        <g className="coach-shake">
          <rect x="22" y="12" width="20" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M14 26c-3 4-3 8 0 12M50 26c3 4 3 8 0 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {gesture === "type" && (
        <>
          <rect x="10" y="24" width="44" height="16" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="17" y="29" width="3" height="6" fill="currentColor" className="coach-caret" />
        </>
      )}
      {gesture === "look" && (
        <g className="coach-look">
          <path d="M8 32s9-14 24-14 24 14 24 14-9 14-24 14S8 32 8 32Z" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="32" cy="32" r="6" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
