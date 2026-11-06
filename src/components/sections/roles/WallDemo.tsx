"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { sfx } from "@/components/home/sound";
import { rolesDemo, type RoleId } from "@/data/roles";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { Cost, Note } from "./shared";

type Card = { id: string; title: string; text: string; have: boolean; from: RoleId; missing: string; at: { x: number; y: number }; tilt: string };

/** A string between two pins, hanging `sag` below the straight line. */
const rope = ([a, b]: { x: number; y: number }[], sag: number) => `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + sag} ${b.x} ${b.y}`;

/** The point a string ties to: the pin at the top middle of a card. */
const pinOf = (c: Card) => ({ x: c.at.x + 22, y: c.at.y + 1 });

/**
 * Archivist: the evidence wall. Tap one piece, then another, to tie a string
 * between them. Two things that can't both be true pull it tight; two that
 * agree leave it slack, which clears someone.
 */
export function WallDemo({ statement, record, jar, tied, onTie, go }: { statement: boolean; record: boolean; jar: boolean; tied: boolean; onTie: () => void; go: (role: RoleId) => void }) {
  const { interview, search, wall } = rolesDemo;
  const scanner = search.records.find((r) => r.id === "scanner")!;
  const cards: Card[] = [
    { id: "ollie", title: `${interview.name}: 8:41 to 8:44`, text: `“${interview.answer.split(".")[0]}.”`, have: statement, from: "interviewer", missing: `Get ${interview.name}'s story from the Interviewer`, at: { x: 3, y: 7 }, tilt: "-rotate-2" },
    {
      id: "scanner",
      title: "QuickParcel scanner",
      text: scanner.rows.slice(0, 2).map((r) => `${r.time} · next door`).join("\n"),
      have: record,
      from: "tech",
      missing: "Get his scanner from the Tech",
      at: { x: 53, y: 15 },
      tilt: "rotate-2",
    },
    { id: "jar", title: "The jar at 8:38", text: "Stuffed with notes, by the card reader.", have: jar, from: "photographer", missing: "Get a photo from the Photographer", at: { x: 28, y: 56 }, tilt: "rotate-1" },
  ];
  const [picked, setPicked] = useState<string | null>(null);
  const [string, setString] = useState<{ a: string; b: string; ok: boolean; key: number } | null>(tied ? { a: "ollie", b: "scanner", ok: true, key: 0 } : null);

  const tap = (id: string) => {
    if (!picked) return setPicked(id);
    if (picked === id) return setPicked(null);
    const pair = [picked, id].sort().join("+");
    const ok = pair === "ollie+scanner";
    sfx.string();
    setString({ a: picked, b: id, ok, key: Date.now() });
    setPicked(null);
    if (ok) {
      window.setTimeout(() => sfx.stamp(), 500);
      onTie();
    }
  };

  const ends = string && [cards.find((c) => c.id === string.a)!, cards.find((c) => c.id === string.b)!].map(pinOf);

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] border-[0.1875rem] border-ink bg-[#b98a5a] shadow-pop-sm [background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1.5px)] [background-size:9px_9px] sm:aspect-[16/9]">
        {cards.map((c) =>
          c.have ? (
            <button
              key={c.id}
              type="button"
              onClick={() => tap(c.id)}
              aria-pressed={picked === c.id}
              className={cx(
                "absolute w-[44%] rounded-lg border-2 border-ink bg-cream p-2 pt-3 text-left text-ink shadow-pop-sm transition-transform sm:p-3 sm:pt-4",
                c.tilt,
                picked === c.id ? "z-10 scale-105 outline-[3px] outline-offset-2 outline-mustard" : "hover:scale-[1.03]",
              )}
              style={{ left: `${c.at.x}%`, top: `${c.at.y}%` }}
            >
              <Image src={propArt.pushpin} alt="" sizes="24px" className="absolute -top-3 left-1/2 w-6 -translate-x-1/2" />
              <span className="block text-xs leading-tight font-extrabold sm:text-sm">{c.title}</span>
              <span className="mt-1 block text-[0.7rem] leading-snug font-semibold whitespace-pre-line text-ink/80 sm:text-xs">{c.text}</span>
            </button>
          ) : c.missing ? (
            <button
              key={c.id}
              type="button"
              onClick={() => go(c.from)}
              className="absolute w-[44%] rounded-lg border-2 border-dashed border-ink/50 bg-ink/10 p-2 text-left text-xs font-bold text-ink/75 transition-colors hover:bg-ink/20 sm:p-3 sm:text-sm"
              style={{ left: `${c.at.x}%`, top: `${c.at.y}%` }}
            >
              {c.missing} →
            </button>
          ) : null,
        )}

        {/* The string, drawn over the cards from pin to pin. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full">
          <AnimatePresence>
            {string && ends && (
              <m.path
                key={string.key}
                fill="none"
                stroke="#c8102e"
                strokeWidth={3.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                // Pulled straight as it's tied, then it settles into a slack hang, or drops off the wall.
                initial={{ d: rope(ends, 0), opacity: 0 }}
                animate={string.ok ? { d: rope(ends, 12), opacity: 1 } : { d: [rope(ends, 0), rope(ends, 6), rope(ends, 30)], opacity: [1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={string.ok ? { type: "spring", stiffness: 120, damping: 7 } : { duration: 1.3, times: [0, 0.35, 1] }}
                style={{ filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.35))" }}
              />
            )}
          </AnimatePresence>
        </svg>

        {string?.ok && (
          <m.p
            className="absolute right-[6%] bottom-[7%] z-30 rounded-xl border-[0.3125rem] border-teal bg-cream/80 px-3 py-0.5 font-display text-2xl tracking-widest text-teal uppercase sm:text-3xl"
            initial={{ scale: 2.2, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.45 }}
          >
            {wall.verdict}
          </m.p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {string?.ok ? (
          <Note key="ok" tone="text-cream/90">
            {wall.text}
          </Note>
        ) : string ? (
          <Note key={string.key} tone="text-coral">
            Nothing to tie there: the jar says nothing about where {interview.name} was. The string drops.
          </Note>
        ) : (
          <Note key="hint">{statement && record ? `Tap ${interview.name}'s story, then his scanner, to tie them together.` : "Your wall fills up as your teammates pin what they find."}</Note>
        )}
      </AnimatePresence>
      <Cost>In the game you can drag the string too, and one that drops costs a few minutes of the night.</Cost>
    </div>
  );
}
