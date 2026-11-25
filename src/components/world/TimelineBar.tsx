"use client";

import { useMemo } from "react";
import { formatSpan, parseTime } from "@/lib/game/clock";
import type { PlayerView } from "@/lib/game/engine";
import { timelineOf, type MomentKind } from "@/lib/game/timeline";
import { cx } from "@/lib/cx";

/** The same colours the Evidence timeline uses: on record, somebody says, seen. */
const TONE: Record<MomentKind, string> = { record: "bg-teal", said: "bg-lilac", seen: "bg-mustard" };

/**
 * The night so far, as a thin bar over the dock (W2.6): a dot for every timed moment in the evidence this player
 * can see, placed by time, coloured by how it's known. Tapping one opens its piece. It's the at-a-glance strip of the
 * classic Evidence timeline; the rewind (W4) puts the same night into the building.
 */
export function TimelineBar({ view, onOpen }: { view: PlayerView; onOpen: (evidenceId: string) => void }) {
  const moments = useMemo(() => {
    let start: number | undefined;
    try {
      if (view.deadline) start = parseTime(view.deadline.end) - view.deadline.night;
    } catch {}
    return timelineOf(view.evidence, start);
  }, [view.evidence, view.deadline]);
  if (moments.length < 2) return null;

  const first = moments[0].at;
  const last = moments[moments.length - 1].at;
  const span = Math.max(1, last - first);
  return (
    <nav
      aria-label="The night so far"
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-2xl items-center gap-2 rounded-full border-2 border-ink bg-night/90 px-3 py-1.5 shadow-pop-sm"
    >
      <span className="shrink-0 font-mono text-[11px] font-bold text-cream/70">{moments[0].time}</span>
      <span className="relative h-5 min-w-0 flex-1">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-cream/20" />
        {moments.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onOpen(m.evidenceId)}
            aria-label={`${m.time}: ${m.text}`}
            title={`${m.time} · ${m.text}`}
            className="absolute top-1/2 grid size-6 -translate-1/2 place-items-center"
            style={{ left: `${((m.at - first) / span) * 100}%` }}
          >
            <span className={cx("size-2.5 rounded-full border border-ink", TONE[m.kind], m.edited && "ring-2 ring-coral")} />
          </button>
        ))}
      </span>
      <span className="shrink-0 font-mono text-[11px] font-bold text-cream/70">{moments[moments.length - 1].time}</span>
      <span className="sr-only">{formatSpan(span)} of the night</span>
    </nav>
  );
}
