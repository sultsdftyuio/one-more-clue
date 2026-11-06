"use client";

import { evidenceIn, useGame } from "./context";
import { Icon } from "./ui/Icon";
import { Wall } from "./wall/Wall";

/** The board at a glance on a laptop, so it stays part of the room. Tap it to open it properly. */
export function BoardPeek({ onOpen }: { onOpen: () => void }) {
  const { view } = useGame();
  const pins = view.pins.flatMap((p) => {
    const e = evidenceIn(view, p.evidenceId);
    return e ? [e] : [];
  });
  return (
    <button type="button" onClick={onOpen} className="sticky top-28 hidden w-full text-left transition-transform hover:-translate-y-0.5 lg:block" aria-label={`Open the board: ${pins.length} of ${view.pinLimit} pinned`}>
      <span className="mb-1.5 flex items-center gap-2 font-display text-lg text-cream">
        <Icon name="board" className="size-5" /> The board
        <span className="ml-auto rounded-full border-2 border-ink bg-cream px-2 font-sans text-xs font-black text-ink">
          {pins.length}/{view.pinLimit}
        </span>
      </span>
      <span className="corkboard grid grid-cols-2 items-start gap-1.5 rounded-2xl border-[3px] border-ink p-2 shadow-pop-sm">
        {pins.map((e) => (
          <span key={e.id} className="line-clamp-2 min-h-9 rounded-sm border border-ink/40 bg-cream px-1.5 py-1 text-[0.7rem] leading-tight font-bold text-ink">
            {e.title}
          </span>
        ))}
        {Array.from({ length: Math.max(0, view.pinLimit - pins.length) }, (_, i) => (
          <span key={i} className="block min-h-9 rounded-sm border-2 border-dashed border-ink/20" />
        ))}
      </span>
    </button>
  );
}

/** The shared board: everyone sees what's pinned here, and it only holds a few things. */
export function BoardPanel() {
  const { view, open } = useGame();
  const pins = view.pins.flatMap((p) => {
    const e = evidenceIn(view, p.evidenceId);
    return e ? [e] : [];
  });
  const empty = Math.max(0, view.pinLimit - pins.length);

  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2 font-display text-2xl text-cream">
        <Icon name="board" /> The board
        <span className="ml-auto rounded-full border-2 border-ink bg-cream px-3 py-0.5 font-sans text-sm font-black text-ink">
          {pins.length}/{view.pinLimit}
        </span>
      </h2>
      <p className="mb-4 text-sm font-bold text-cream/65">
        Everyone sees what&apos;s pinned here, and red string ties every lie caught. Space is tight: {empty} {empty === 1 ? "pin" : "pins"} left.
      </p>
      <Wall pieces={pins} places={view.wall} strings={view.strings} onTap={(id) => open(id)} />
    </section>
  );
}
