"use client";

import Image from "next/image";
import { useState } from "react";
import { propArt } from "@/lib/art";
import { EMPTY_CHECKS, type VisibleEvidence } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { useGame } from "../../context";
import { Icon } from "../../ui/Icon";

/** The Archivist keeps the case folder: lay two papers side by side and see if they can both be true. */
export function ArchivistTool() {
  const { view, act, busy } = useGame();
  const [picked, setPicked] = useState<string[]>([]);
  const candidates = view.evidence.filter((e) => e.body.type !== "scene");
  const key = [...picked].sort().join("+");
  const tried = picked.length === 2 && view.checked.includes(key);
  const hunches = view.checksLeft ?? EMPTY_CHECKS;

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length === 2 ? [p[1], id] : [...p, id]));

  const compare = async () => {
    if (await act({ type: "crosscheck", a: picked[0], b: picked[1] })) setPicked([]);
  };

  const slip = (i: number) => {
    const e = candidates.find((c) => c.id === picked[i]);
    return (
      <span
        className={cx(
          "flex min-h-16 flex-1 items-center justify-center rounded-md border-2 p-2 text-center text-sm font-extrabold",
          i ? "rotate-1" : "-rotate-1",
          e ? "border-ink bg-cream shadow-pop-sm" : "border-dashed border-ink/35 text-ink/45",
        )}
      >
        {e ? e.title : `Pick ${i ? "another" : "one"}`}
      </span>
    );
  };

  return (
    <section className="tool-folder relative mt-4 rounded-2xl rounded-tl-none border-[3px] border-ink p-4 text-ink shadow-pop sm:p-5">
      <span className="absolute -top-[1.85rem] -left-[3px] rounded-t-xl border-[3px] border-b-0 border-ink bg-[#e3c48d] px-4 py-0.5 text-xs font-black tracking-widest uppercase">Case file</span>
      <header className="mb-1 flex items-center gap-2.5">
        <Image src={propArt.folder} alt="" sizes="56px" className="w-11 -rotate-6" />
        <h3 className="flex-1 font-display text-2xl leading-tight">Cross-check</h3>
        <span className="-rotate-6 rounded border-2 border-coral-dk px-1.5 text-xs font-black tracking-wider text-coral-dk uppercase">Confidential</span>
      </header>
      <p className="mb-3 text-sm leading-snug font-semibold text-ink/70">Lay two papers side by side. If they can&apos;t both be true, you&apos;ve caught a lie. Ask others to pin what you need.</p>
      <div className="mb-1 flex items-center gap-2" aria-label={`${hunches} of ${EMPTY_CHECKS} hunches left this chapter`}>
        {Array.from({ length: EMPTY_CHECKS }, (_, i) => (
          <span key={i} className={cx("grid size-7 place-items-center rounded-full border-2", i < hunches ? "border-coral-dk text-coral-dk" : "border-ink/20 text-ink/20")}>
            <Icon name="bulb" className="size-4" />
          </span>
        ))}
        <span className="ml-1 text-sm font-extrabold">{hunches ? `${hunches} ${hunches === 1 ? "hunch" : "hunches"} left` : "No hunches left"}</span>
      </div>
      <p className="mb-4 text-sm font-semibold text-ink/65">
        {hunches ? "A compare that finds nothing uses a hunch. Talk it through first." : "Only a real contradiction will count until the next chapter."}
      </p>
      <div className="flex items-center gap-2">
        {slip(0)}
        <Icon name="scale" className="text-ink/50" />
        {slip(1)}
      </div>
      <button
        type="button"
        disabled={busy || picked.length !== 2 || tried}
        onClick={compare}
        className="mt-4 w-full rounded-xl border-[3px] border-ink bg-coral py-2.5 font-display text-lg tracking-wide text-cream shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {tried ? "Already compared, they agree" : "Compare"}
      </button>
      <ul className="mt-4 flex flex-wrap gap-2">
        {candidates.map((e: VisibleEvidence) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => toggle(e.id)}
              aria-pressed={picked.includes(e.id)}
              className={cx(
                "rounded-md border-2 border-ink px-3 py-1 text-sm font-bold transition-colors",
                picked.includes(e.id) ? "bg-ink text-cream" : "bg-cream/70 hover:bg-cream",
              )}
            >
              {e.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
