"use client";

import { evidenceIn, useGame } from "./context";
import { EvidenceTile } from "./evidence/EvidenceCard";
import { Icon } from "./ui/Icon";

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
      <p className="mb-4 text-sm font-bold text-cream/65">Everyone sees what&apos;s pinned here. Space is tight, so agree on what matters.</p>
      <ul className="corkboard grid grid-cols-2 items-start gap-x-3 gap-y-4 rounded-2xl border-[3px] border-ink p-3.5 shadow-pop">
        {pins.map((e, i) => (
          <li key={e.id}>
            <EvidenceTile evidence={e} index={i} onOpen={() => open(e.id)} />
          </li>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="grid min-h-28 place-items-center rounded-lg border-2 border-dashed border-ink/25 text-ink/30">
            <Icon name="pin" />
          </li>
        ))}
      </ul>
    </section>
  );
}
