"use client";

import Image from "next/image";
import { animate, AnimatePresence, m, useMotionTemplate, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useBlackout } from "@/components/home/blackout";
import type { EvidenceEntry } from "@/data/mini-case";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";

type Uv = { mark: string; notes: string[] };
type Props = { source: string; entries: EvidenceEntry[]; uv: Uv; highlight?: boolean };

/** UV ink: invisible on paper, glowing under the torch. */
const glow = "text-[#22e3b0] [text-shadow:0_0_6px_rgba(95,255,210,0.9),0_0_14px_rgba(95,255,210,0.6)]";

/** Splits `text` around the first case-insensitive match of `mark`. */
function splitMark(text: string, mark: string) {
  const i = text.toLowerCase().indexOf(mark.toLowerCase());
  return i < 0 ? null : [text.slice(0, i), text.slice(i, i + mark.length), text.slice(i + mark.length)];
}

/**
 * The printed report, drawn twice with the same layout: once as paper, once
 * as the UV ink that sits exactly on top of it (everything else transparent).
 */
function Sheet({ entries, uv, ink }: { entries: EvidenceEntry[]; uv: Uv; ink?: boolean }) {
  return (
    <div className={cx(ink && "text-transparent")}>
      <ol className="space-y-4 p-5">
        {entries.map((entry, i) => {
          const parts = splitMark(entry.text, uv.mark);
          return (
            <li key={entry.time} className="flex gap-3">
              <span
                className={cx(
                  "relative h-fit shrink-0 rounded-lg border-2 px-2 py-0.5 font-display text-base",
                  ink ? "border-transparent" : "border-ink bg-mustard",
                )}
              >
                {entry.time}
                {/* Circled in UV ink. */}
                {ink && i === 0 && <span className="absolute -inset-2 -rotate-6 rounded-[50%] border-[0.1875rem] border-[#22e3b0] shadow-[0_0_10px_rgba(95,255,210,0.8)]" />}
              </span>
              <span className="leading-snug font-semibold">
                {parts ? (
                  <>
                    {parts[0]}
                    <span className={cx(ink && cx(glow, "rounded bg-[#5fffd2]/20 underline decoration-wavy decoration-2 underline-offset-4"))}>{parts[1]}</span>
                    {parts[2]}
                  </>
                ) : (
                  entry.text
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {/* The margin for notes: blank ruled lines on paper, handwriting under UV. */}
      <div className="mx-5 mb-3 border-t-2 border-dashed border-ink/20 pt-2">
        <p className={cx("text-[0.7rem] font-extrabold tracking-widest uppercase", ink ? "text-transparent" : "text-ink/40")}>Notes</p>
        {uv.notes.map((note, i) => (
          <p
            key={note}
            className={cx(
              "h-8 border-b-2 font-display text-xl leading-8",
              ink ? cx(glow, "border-transparent", i % 2 ? "rotate-1 pl-6" : "-rotate-2") : "border-ink/10 text-transparent",
            )}
          >
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * The one piece of evidence in the warm-up. After 9:17 a UV torch shows
 * invisible ink on it: it follows the mouse, or sweeps by itself on phones
 * (tap to move it). Catching the liar lights all of it up. After a wrong guess
 * the card glows: look here.
 */
export function EvidenceCard({ source, entries, uv, highlight }: Props) {
  const { phase } = useBlackout();
  const torch = phase === "dark";
  const revealed = phase === "restored";
  const area = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const [steered, setSteered] = useState(false);
  const mask = useMotionTemplate`radial-gradient(circle 4.5rem at ${x}px ${y}px, #000 55%, transparent 100%)`;

  // Until someone takes the torch, it sweeps across the report by itself.
  useEffect(() => {
    const el = area.current;
    if (!torch || steered || !el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      x.set(w * 0.55);
      y.set(h * 0.25);
      return;
    }
    const opts = { duration: 6, repeat: Infinity, ease: "easeInOut" } as const;
    const runs: AnimationPlaybackControls[] = [
      animate(x, [w * 0.15, w * 0.85, w * 0.6, w * 0.25, w * 0.15], opts),
      animate(y, [h * 0.12, h * 0.22, h * 0.7, h * 0.85, h * 0.12], opts),
    ];
    return () => runs.forEach((r) => r.stop());
  }, [torch, steered, x, y]);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    if (!torch) return;
    const r = e.currentTarget.getBoundingClientRect();
    setSteered(true);
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };

  return (
    <m.div
      className="relative mx-auto max-w-sm rotate-1"
      animate={highlight ? { scale: [1, 1.04, 1], rotate: [1, -1, 1] } : { scale: 1, rotate: 1 }}
      transition={highlight ? { duration: 0.9, repeat: 2 } : { duration: 0.3 }}
    >
      <m.div
        aria-hidden
        className="absolute inset-[-18px] -z-10 rounded-[2rem] bg-[radial-gradient(circle,rgba(242,179,61,0.55),rgba(242,179,61,0)_70%)]"
        animate={{ opacity: highlight ? [0.4, 1, 0.4] : 0 }}
        transition={highlight ? { duration: 1.6, repeat: Infinity } : { duration: 0.4 }}
      />
      <Image src={propArt.pushpin} alt="" sizes="64px" className="absolute -top-8 left-1/2 z-10 w-16 -translate-x-1/2" />
      <Image src={propArt.clock} alt="" sizes="112px" className="absolute -top-12 -right-8 z-10 w-28 rotate-12 animate-float" />

      <AnimatePresence>
        {torch && (
          <m.p
            role="status"
            className="absolute -bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-full border-[0.1875rem] border-ink bg-lilac px-3 py-1 text-center text-sm font-extrabold whitespace-nowrap text-ink shadow-pop-sm"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ delay: 1.6, type: "spring", stiffness: 300, damping: 18 }}
          >
            🔦 Lights out. Shine the UV torch
          </m.p>
        )}
      </AnimatePresence>

      <div className={cx("overflow-hidden rounded-2xl border-[0.1875rem] border-ink bg-cream text-ink shadow-card", highlight && "ring-4 ring-mustard")}>
        <p className="bg-ink px-5 py-3 text-xs font-extrabold tracking-widest text-mustard uppercase">Evidence · {source}</p>
        <div ref={area} className={cx("relative", torch && "cursor-none")} onPointerMove={(e) => e.pointerType === "mouse" && aim(e)} onPointerDown={aim}>
          <Sheet entries={entries} uv={uv} />
          {(torch || revealed) && (
            <m.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: revealed ? 0.8 : 0.3 }}
              // "none" rather than leaving it out: Motion keeps a style it set earlier.
              style={{ maskImage: revealed ? "none" : mask, WebkitMaskImage: revealed ? "none" : mask }}
            >
              {/* The violet wash of the UV light itself. */}
              <div className={cx("absolute inset-0", revealed ? "bg-[#6b4cff]/8" : "bg-[#6b4cff]/30 mix-blend-multiply")} />
              <Sheet entries={entries} uv={uv} ink />
            </m.div>
          )}
        </div>
        <p className="border-t-2 border-dashed border-ink/25 px-5 py-3 text-sm font-bold text-ink/60">
          Every alibi below is about the minute the lights went out.
        </p>
      </div>
    </m.div>
  );
}
