"use client";

import type { VisibleEvidence } from "@/lib/game/engine";
import { formatSpan, parseTime } from "@/lib/game/clock";
import { minutesBetween, timelineOf, type Moment, type MomentKind } from "@/lib/game/timeline";
import { cx } from "@/lib/cx";
import { evidenceIn, useGame } from "../context";
import { Icon } from "../ui/Icon";
import { Face, kindOf, namedIn } from "./kinds";

const KIND: Record<MomentKind, { label: string; tone: string }> = {
  record: { label: "On record", tone: "bg-teal" },
  said: { label: "Somebody says", tone: "bg-lilac" },
  seen: { label: "Seen", tone: "bg-mustard" },
};

/** A quiet stretch this long gets a "33 min later" marker, so the gaps in the night are easy to read. */
const GAP_MINUTES = 15;

/** When the investigation begins, in minutes after midnight: the end of the night less its length. */
function investigationStart(deadline: { end: string; night: number } | null | undefined) {
  if (!deadline) return undefined;
  try {
    return parseTime(deadline.end) - deadline.night;
  } catch {
    return undefined;
  }
}

/** One moment of the night: what happened, how it's known, and which piece says so. Tapping opens the piece. */
function MomentCard({ moment }: { moment: Moment }) {
  const { view, open } = useGame();
  const piece = evidenceIn(view, moment.evidenceId);
  if (!piece) return null;
  const kind = kindOf(piece);
  const speaker = moment.who ? namedIn(moment.who, view.case.suspects)[0] : undefined;
  return (
    <button
      type="button"
      onClick={() => open(piece.id)}
      className="flex w-full min-w-0 items-stretch gap-2 rounded-xl border-2 border-ink bg-cream py-2 pr-2.5 pl-2 text-left text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5"
    >
      <span aria-hidden className={cx("w-1.5 shrink-0 rounded-full", KIND[moment.kind].tone)} />
      {speaker && <Face suspect={speaker} className="size-8 self-start rounded-full border-2 border-ink bg-cream-dk" />}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-3 text-sm leading-snug font-semibold">
          <span className="sr-only">{KIND[moment.kind].label}: </span>
          {moment.who ? (
            <>
              <b className="font-extrabold">{moment.who}:</b> “{moment.text}”
            </>
          ) : (
            moment.text
          )}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[0.7rem] leading-tight font-extrabold text-ink/55">
          <Icon name={kind.icon} className="size-3" />
          <span className="min-w-0 truncate">{piece.title}</span>
          {moment.edited && <span className="shrink-0 rounded-sm bg-coral px-1 text-cream">edited</span>}
          {piece.pinned ? <Icon name="pin" className="size-3 text-mustard-dk" filled /> : <Icon name="lock" className="size-3" />}
        </span>
      </span>
    </button>
  );
}

/**
 * The night in order: every clock time in these pieces on one line, earliest
 * first, with what a machine recorded, what somebody says and what was seen
 * told apart by colour. Two pieces that can't both be true end up side by side.
 */
export function EvidenceTimeline({ pieces }: { pieces: VisibleEvidence[] }) {
  const { view, open } = useGame();
  const line = timelineOf(pieces, investigationStart(view.deadline));

  // Moments at the same minute share one mark on the line.
  const groups: { at: number; time: string; moments: Moment[] }[] = [];
  for (const moment of line) {
    const last = groups.at(-1);
    if (last && last.at === moment.at) {
      last.moments.push(moment);
      if (moment.time.length > last.time.length) last.time = moment.time;
    } else {
      groups.push({ at: moment.at, time: moment.time, moments: [moment] });
    }
  }

  const timed = new Set(line.map((m) => m.evidenceId));
  const untimed = pieces.filter((e) => !timed.has(e.id));

  return (
    <div>
      {groups.length > 0 ? (
        <>
          <ul className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-cream/70" aria-label="What the colours mean">
            {Object.values(KIND).map((k) => (
              <li key={k.label} className="flex items-center gap-1.5">
                <span aria-hidden className={cx("h-3 w-1.5 rounded-full", k.tone)} />
                {k.label}
              </li>
            ))}
          </ul>
          <ol className="relative">
            <span aria-hidden className="absolute top-2 bottom-4 left-[4.875rem] w-0.5 rounded-full bg-cream/20" />
            {groups.map((group, i) => {
              const gap = i > 0 ? Math.round(minutesBetween(groups[i - 1].moments[0], group.moments[0])) : 0;
              return (
                <li key={group.moments[0].id} className="relative grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-5 pb-3">
                  {gap >= GAP_MINUTES && <span className="col-start-2 pb-2.5 text-[0.7rem] font-extrabold tracking-wide text-cream/45 uppercase">{formatSpan(gap)} later</span>}
                  <span className="relative col-start-1 pt-2 text-right font-mono text-[0.8rem] leading-tight font-bold text-mustard">
                    {group.time}
                    <span aria-hidden className="absolute top-2.5 right-[-0.625rem] size-3 translate-x-1/2 rounded-full border-2 border-ink bg-mustard" />
                  </span>
                  <span className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
                    {group.moments.map((m) => (
                      <MomentCard key={m.id} moment={m} />
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-cream/25 px-4 py-6 text-center text-sm font-bold text-cream/65">No times yet. Any piece with a clock time on it lines up here.</p>
      )}

      {untimed.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-[0.75rem] font-extrabold tracking-widest text-cream/60 uppercase">No time on these</h3>
          <ul className="flex flex-wrap gap-1.5">
            {untimed.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => open(e.id)} className="inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-2.5 py-1 text-left text-xs font-extrabold text-ink">
                  <Icon name={kindOf(e).icon} className="size-3.5" />
                  <span className="truncate">{e.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
