"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { play } from "@/components/game/audio/sound";
import { buzz, BUZZ } from "@/components/game/haptics";
import { cx } from "@/lib/cx";
import type { Help } from "@/lib/game/helps";

export type Stars = 1 | 2 | 3;
/** What every side job gets: call `onDone` once, with how well it went. There's no failing. */
export type GameProps = { onDone: (stars: Stars) => void };

/** The helps' look: the same three marks in the HUD chip, on spots and on the win card. */
export const HELP_LOOK: Record<Help, { label: string; color: string; glyph: ReactNode }> = {
  coffee: {
    label: "Coffee",
    color: "bg-[#c98a4b]",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
        <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="currentColor" />
        <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 3.5c-1 1.2 1 1.8 0 3M12 3.5c-1 1.2 1 1.8 0 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  lightbulb: {
    label: "Lightbulb",
    color: "bg-mustard",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" fill="currentColor" />
        <rect x="9.5" y="18" width="5" height="2.6" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  "sore-spot": {
    label: "Sore spot",
    color: "bg-[#6fb6ff]",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden="true">
        <path d="M12 3.5c3 4.2 5.5 7.4 5.5 10.4a5.5 5.5 0 0 1-11 0c0-3 2.5-6.2 5.5-10.4z" fill="currentColor" />
      </svg>
    ),
  },
};

export function HelpMark({ help, className }: { help: Help; className?: string }) {
  const look = HELP_LOOK[help];
  return <span className={cx("grid place-items-center rounded-full border-2 border-ink p-1 text-ink", look.color, className)}>{look.glyph}</span>;
}

/** A requestAnimationFrame loop while `on`, with the time since it started in ms. */
export function useLoop(on: boolean, tick: (ms: number, dt: number) => void) {
  const fn = useRef(tick);
  fn.current = tick;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const start = performance.now();
    let last = start;
    const step = (t: number) => {
      fn.current(t - start, Math.min(64, t - last));
      last = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A side job on screen (W6.1): a header with the way back, the job's name and where it is, and the help it wins;
 * the game; and, once it's played, one win card for every game, with its stars and the help flying into the chip.
 * The help goes to the whole team the moment the game ends (`onFinish`), before the card shows.
 */
export function SideJobFrame({
  title,
  place,
  help,
  helpText,
  backdrop,
  prompt,
  onFinish,
  onClose,
  children,
}: {
  title: string;
  place: string;
  help: Help;
  /** What the win card says the team got, e.g. "Sore spot: Ozzy". */
  helpText: (stars: Stars) => string;
  backdrop: string;
  prompt?: string;
  onFinish: (stars: Stars) => Promise<boolean>;
  onClose: () => void;
  children: (done: (stars: Stars) => void) => ReactNode;
}) {
  const [result, setResult] = useState<Stars | null>(null);
  // In: an iris opens on a title card and a "3, 2, 1, GO!" count; the game only starts after GO. Out: the iris closes.
  const [stage, setStage] = useState<"intro" | "play" | "closing">(() => (reducedMotion() ? "play" : "intro"));
  const [count, setCount] = useState(3);
  const sent = useRef(false);
  const done = (stars: Stars) => {
    if (sent.current) return;
    sent.current = true;
    play("solved");
    buzz(BUZZ.crack);
    void onFinish(stars).then(() => setResult(stars));
  };
  const leave = () => {
    if (reducedMotion()) return onClose();
    setStage("closing");
    window.setTimeout(onClose, 320);
  };

  useEffect(() => {
    if (stage !== "intro") return;
    play("whoosh");
    const timers = [
      window.setTimeout(() => (setCount(2), play("tick")), 1000),
      window.setTimeout(() => (setCount(1), play("tick")), 1550),
      window.setTimeout(() => (setCount(0), play("found")), 2100),
      window.setTimeout(() => setStage("play"), 2550),
    ];
    play("tick");
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && leave();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // `leave` only reads stable things.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cx("fixed inset-0 z-50 flex touch-none flex-col overflow-hidden text-cream select-none", backdrop, stage === "closing" ? "world-iris-out" : "world-iris-in")}
    >
      <header className="relative z-20 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
        <button type="button" autoFocus onClick={leave} aria-label="Back to the building" className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-cream/40 bg-black/30">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[1.7rem] leading-none italic">{title}</h2>
          <p className="mt-1 truncate text-xs font-extrabold text-mustard">{place}</p>
        </div>
        <span data-help-chip className={cx("flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-cream py-1 pr-3 pl-1 text-sm font-extrabold text-ink", result && "animate-pop-in")}>
          <HelpMark help={help} className="size-6" />
          {HELP_LOOK[help].label}
        </span>
      </header>
      <div className="relative min-h-0 flex-1">{stage !== "intro" && children(done)}</div>
      {prompt && !result && stage !== "intro" && (
        <p className="pointer-events-none relative z-10 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-base font-extrabold text-cream/85">{prompt}</p>
      )}
      {stage === "intro" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/35 p-6" aria-live="polite">
          <div className="flex flex-col items-center gap-4 text-center">
            <HelpMark help={help} className="world-pop size-20 shadow-card" />
            <p className="world-pop font-display text-5xl italic [animation-delay:120ms] [text-shadow:3px_3px_0_#141829]">{title}</p>
            {prompt && <p className="world-pop rounded-full border-2 border-ink bg-cream px-4 py-1.5 text-lg font-extrabold text-ink [animation-delay:260ms]">{prompt}</p>}
            <p key={count} className="world-count font-display text-7xl text-mustard [text-shadow:4px_4px_0_#141829]">{count > 0 ? count : "GO!"}</p>
          </div>
        </div>
      )}
      {result && (
        <div className="absolute inset-0 z-30 grid place-items-end bg-black/40 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Confetti />
          <section aria-live="polite" className="mx-auto w-full max-w-sm animate-pop-in rounded-3xl border-[3px] border-ink bg-cream p-5 text-center text-ink shadow-card">
            <p className="flex justify-center gap-2" aria-label={`${result} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <svg key={n} viewBox="0 0 24 24" aria-hidden="true" className={cx("size-11 animate-stamp", n <= result ? "text-mustard" : "text-ink/15")} style={{ animationDelay: `${n * 140}ms` }}>
                  <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="currentColor" stroke="#141829" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              ))}
            </p>
            <p className="mt-3 flex items-center justify-center gap-2 font-display text-2xl">
              <HelpMark help={help} className="size-8" /> {helpText(result)}
            </p>
            <p className="mt-1 text-sm font-bold text-ink/65">For the whole team.</p>
                <button type="button" autoFocus onClick={leave} className="mt-4 w-full rounded-2xl border-[3px] border-ink bg-mustard px-4 py-3 font-display text-xl shadow-pop-sm">
              Back to the building
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

/** A burst of paper confetti behind the win card (none with reduced motion). */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: 8 + ((i * 37) % 84),
        delay: (i % 7) * 60,
        dx: ((i * 53) % 120) - 60,
        spin: ((i * 97) % 720) - 360,
        colour: ["#F2B33D", "#E8574A", "#3FB8AF", "#9B87F5", "#FFF4E0"][i % 5],
        w: 6 + (i % 3) * 3,
      })),
    [],
  );
  if (reducedMotion()) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="world-confetti absolute top-[38%] block h-3 rounded-sm"
          style={{ left: `${p.left}%`, width: p.w, background: p.colour, animationDelay: `${p.delay}ms`, ["--dx" as string]: `${p.dx}px`, ["--spin" as string]: `${p.spin}deg` }}
        />
      ))}
    </div>
  );
}
