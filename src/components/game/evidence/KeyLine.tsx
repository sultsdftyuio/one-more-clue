"use client";

import { useState } from "react";
import type { VisibleEvidence } from "@/lib/game/engine";
import { linesOf } from "@/lib/game/lines";
import { cx } from "@/lib/cx";
import { nameOf, useGame } from "../context";
import { Icon } from "../ui/Icon";

/**
 * The line that matters. Anyone who can read a piece can highlight one line of
 * it, and the highlight shows on the piece and on its card for everyone else
 * who can read it. One line a piece: a new pick replaces the old one.
 */
export function KeyLine({ evidence }: { evidence: VisibleEvidence }) {
  const { view, act, busy } = useGame();
  const [picking, setPicking] = useState(false);
  const lines = linesOf(evidence.body);
  const mark = evidence.mark;
  const live = view.phase === "investigation";
  // A piece that is one line long has nothing to choose between.
  if (!mark && (!live || lines.length < 2)) return null;

  return (
    <div className="mt-4">
      {mark && (
        <p className="rounded-xl border-2 border-ink bg-mustard px-3 py-2 text-ink">
          <span className="flex items-center gap-1.5 text-[0.7rem] font-extrabold tracking-wide uppercase">
            <Icon name="marker" className="size-3.5" /> Highlighted by {nameOf(view, mark.by)}
          </span>
          <span className="mt-0.5 block text-sm leading-snug font-bold">{mark.text}</span>
        </p>
      )}

      {live && !picking && (
        <div className={cx("flex flex-wrap items-center gap-2", mark && "mt-2")}>
          {lines.length > 1 && (
            <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-3.5 py-2 text-sm font-extrabold text-ink hover:bg-mustard">
              <Icon name="marker" className="size-4" /> {mark ? "Pick another line" : "Highlight a line"}
            </button>
          )}
          {mark && (
            <button type="button" disabled={busy} onClick={() => act({ type: "mark", evidenceId: evidence.id, line: null })} className="rounded-full px-2 py-2 text-sm font-extrabold text-cream/70 underline hover:text-cream">
              Clear
            </button>
          )}
        </div>
      )}

      {live && picking && (
        <div className="rounded-2xl border-2 border-dashed border-mustard/70 p-2.5">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-moon">
            <Icon name="marker" className="size-4 shrink-0" />
            <span className="flex-1">Tap the line that matters. The team sees it highlighted.</span>
            <button type="button" onClick={() => setPicking(false)} className="shrink-0 rounded-full px-2 text-cream/70 underline hover:text-cream">
              Cancel
            </button>
          </p>
          <ul className="grid gap-1.5">
            {lines.map((line, i) => {
              const on = mark?.line === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={busy || on}
                    aria-pressed={on}
                    onClick={async () => {
                      if (await act({ type: "mark", evidenceId: evidence.id, line: i })) setPicking(false);
                    }}
                    className={cx("w-full rounded-xl border-2 border-ink px-3 py-2 text-left text-sm leading-snug font-bold text-ink transition-colors", on ? "bg-mustard" : "bg-cream hover:bg-moon")}
                  >
                    {line}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
