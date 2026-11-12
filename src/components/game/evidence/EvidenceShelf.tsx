"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerView, VisibleEvidence } from "@/lib/game/engine";
import type { CaseSuspect, EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { evidenceIn, goalOf, nameOf, useGame } from "../context";
import { Icon, type IconName } from "../ui/Icon";
import { EvidenceTimeline } from "./EvidenceTimeline";
import { Face, kindOf, namedIn, shortName } from "./kinds";
import { SceneThumb, ZoomedSpot } from "./SceneView";

/**
 * Which pieces this player has opened, kept on this device. A piece counts as
 * new until it's been opened, unless they found it themselves: the find moment
 * already showed it to them.
 */
export function useSeenEvidence(view: PlayerView) {
  const key = `omc-seen-${view.code}`;
  const [seen, setSeen] = useState<Set<string> | null>(null);

  useEffect(() => {
    try {
      setSeen(new Set(JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[]));
    } catch {
      setSeen(new Set());
    }
  }, [key]);

  const mark = useCallback(
    (id: string) =>
      setSeen((prev) => {
        if (prev?.has(id)) return prev;
        const next = new Set(prev).add(id);
        try {
          window.localStorage.setItem(key, JSON.stringify([...next]));
        } catch {}
        return next;
      }),
    [key],
  );

  const me = view.me.id;
  const isNew = useCallback((e: VisibleEvidence) => seen !== null && !seen.has(e.id) && e.foundBy !== me, [seen, me]);
  return { isNew, mark };
}

/** The words of a piece, without its timestamps. */
function proseOf(body: EvidenceBody): string {
  switch (body.type) {
    case "statement":
    case "document":
    case "finding":
      return body.text;
    case "chat":
      return body.messages.map((m) => m.text).join(" · ");
    case "log":
      return body.rows.map((r) => r.text).join(" · ");
    case "scene":
    case "footage":
    case "recording":
      return body.caption;
  }
}

const CLOCK_TIME = /\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/gi;

/**
 * The clock times a piece carries, as chips: comparing times is most of the
 * detective work. A long chat or tape shows its first and last time as a span.
 */
function timesOf(e: VisibleEvidence): string[] {
  const b = e.body;
  // A log's picture already carries its first and last time.
  if (b.type === "log") return [];
  const stamped = b.type === "chat" ? b.messages.map((m) => m.time) : b.type === "footage" ? b.frames.map((f) => f.time) : [];
  if (stamped.length > 3) return [`${stamped[0]} – ${stamped.at(-1)}`];
  const written = `${e.title} ${proseOf(b)}`.match(CLOCK_TIME) ?? [];
  const all = [...stamped, ...written].map((t) => t.trim());
  return all.filter((t, i) => all.findIndex((o) => o.toUpperCase() === t.toUpperCase()) === i).slice(0, 4);
}

/** Suspects a piece names, by any part of their name. */
function peopleIn(e: VisibleEvidence, suspects: CaseSuspect[]): CaseSuspect[] {
  const b = e.body;
  const text = [e.title, proseOf(b), b.type === "statement" ? b.speaker : "", b.type === "chat" ? b.messages.map((m) => m.from).join(" ") : "", e.compared?.join(" ") ?? ""].join(" ");
  return namedIn(text, suspects);
}

/** A picture wider than its square frame, centred in it. */
const WIDE = "block w-[133.34%] -ml-[16.67%]";

/**
 * The picture on a piece's card. It shows what the piece is at a glance: the
 * photo itself, the face of who's talking, a phone, a printout, a typed sheet.
 */
function Glyph({ evidence }: { evidence: VisibleEvidence }) {
  const { view } = useGame();
  const body = evidence.body;
  const frame = "relative grid size-[4.5rem] shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-ink";

  if (body.type === "scene" || body.type === "footage") {
    return (
      <span className={cx(frame, "bg-night")}>
        <span className={WIDE}>
          <SceneThumb scene={body} />
        </span>
        {body.type === "footage" && <span className="absolute top-1 left-1 rounded-sm bg-coral px-1 text-[0.6rem] leading-tight font-black text-cream">REC</span>}
      </span>
    );
  }

  if (body.type === "finding" && evidence.source === "inspect") {
    const scene = evidence.spot && evidenceIn(view, evidence.spot.scene);
    if (scene && evidence.spot) {
      return (
        <span className={cx(frame, "bg-night")}>
          <ZoomedSpot scene={scene.body} hotspot={evidence.spot.hotspot} className={WIDE} />
          <span className="absolute right-0.5 bottom-0.5 grid size-5 place-items-center rounded-full border-2 border-ink bg-mustard text-ink">
            <Icon name="eye" className="size-3" />
          </span>
        </span>
      );
    }
    return (
      <span className={cx(frame, "bg-[#ffe98f] text-ink")}>
        <Icon name="eye" className="size-8" />
      </span>
    );
  }

  if (body.type === "finding" && evidence.source === "crosscheck") {
    return (
      <span className={cx(frame, "bg-[#f8cfc8] font-display text-5xl leading-none text-coral-dk")} aria-hidden>
        ≠
      </span>
    );
  }

  if (body.type === "statement") {
    const speaker = view.case.suspects.find((s) => s.name === body.speaker);
    const cracked = evidence.source === "press";
    return (
      <span className={cx(frame, cracked ? "bg-coral" : "bg-lilac")}>
        {speaker ? <Face suspect={speaker} mood={cracked ? "cracked" : "idle"} className="size-full" /> : <span className="font-display text-4xl text-ink">{body.speaker[0]}</span>}
        <span className="absolute right-0.5 bottom-0.5 grid size-5 place-items-center rounded-full border-2 border-ink bg-cream text-ink">
          <Icon name="mic" className="size-3" />
        </span>
      </span>
    );
  }

  if (body.type === "chat") {
    return (
      <span className={cx(frame, "content-center gap-1 bg-[#1d2038] px-2")} aria-hidden>
        <span className="h-3 w-9 justify-self-start rounded-md rounded-bl-none bg-[#e8ecf7]" />
        <span className="h-3 w-7 justify-self-end rounded-md rounded-br-none bg-teal" />
        <span className="h-3 w-10 justify-self-start rounded-md rounded-bl-none bg-[#e8ecf7]" />
      </span>
    );
  }

  if (body.type === "log") {
    const first = body.rows[0]?.time;
    const last = body.rows.length > 1 ? body.rows.at(-1)?.time : undefined;
    return (
      <span className={cx(frame, "tile-log content-center px-0.5 text-center font-printer text-[0.8rem] leading-[1.1rem] text-[#27304f]")} aria-hidden>
        {first ? (
          <>
            <span>{first}</span>
            {last && <span>{last}</span>}
          </>
        ) : (
          <Icon name="clock" className="size-8" />
        )}
      </span>
    );
  }

  if (body.type === "recording") {
    return (
      <span className={cx(frame, "grid-flow-col content-center gap-0.5 bg-ink")} aria-hidden>
        {[3, 6, 9, 5, 8, 4, 7].map((h, i) => (
          <span key={i} className="w-1 rounded-full bg-mustard" style={{ height: `${h * 0.25}rem` }} />
        ))}
      </span>
    );
  }

  // A typed sheet, or a plain note.
  return (
    <span className={cx(frame, "content-center gap-1.5 bg-[#fbf6ea] px-2.5")} aria-hidden>
      {[100, 80, 100, 60].map((w, i) => (
        <span key={i} className="h-1 rounded-full bg-ink/35" style={{ width: `${w}%` }} />
      ))}
    </span>
  );
}

const CHIP = "inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-xs leading-tight font-extrabold";

/** One piece of evidence as a card you can read without opening: what it is, what it says, when, who, and who else can see it. */
function EvidenceRow({ evidence, fresh, onOpen }: { evidence: VisibleEvidence; fresh: boolean; onOpen: () => void }) {
  const { view, act, busy } = useGame();
  const kind = kindOf(evidence);
  const body = evidence.body;
  const times = timesOf(evidence);
  const speaker = body.type === "statement" ? body.speaker : null;
  // The talker is already the picture, so the small faces are only the people they talk about.
  const people = peopleIn(evidence, view.case.suspects).filter((s) => s.name !== speaker);
  const canPin = view.phase === "investigation" && !evidence.pinned;
  const full = view.pins.length >= view.pinLimit;
  const by = evidence.foundBy && evidence.foundBy !== view.me.id ? nameOf(view, evidence.foundBy) : null;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        className={cx("flex w-full items-start gap-3 rounded-2xl border-[3px] border-ink bg-cream p-2.5 text-left text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5", canPin && "pr-14")}
      >
        <Glyph evidence={evidence} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 text-[0.7rem] font-extrabold tracking-wide text-ink/60 uppercase">
            <Icon name={kind.icon} className="size-3.5" />
            {kind.label}
            {by && <span className="tracking-normal normal-case">· from {by}</span>}
            {fresh && <span className="rounded-full bg-coral px-1.5 tracking-normal text-cream normal-case">New</span>}
          </span>
          <span className="block font-display text-lg leading-tight">{evidence.title}</span>
          <span className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-ink/75">
            {evidence.mark ? (
              // Someone picked the line that matters, so the card shows that line in place of the opening words.
              <>
                <span className="sr-only">Highlighted by {nameOf(view, evidence.mark.by)}: </span>
                <mark className="rounded-sm bg-mustard/70 box-decoration-clone px-1 py-0.5 font-bold text-ink">{evidence.mark.text}</mark>
              </>
            ) : speaker ? (
              <>
                <b className="font-extrabold text-ink">{speaker}:</b> “{proseOf(body)}”
              </>
            ) : (
              proseOf(body)
            )}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            {evidence.pinned ? (
              <span className={cx(CHIP, "bg-mustard")}>
                <Icon name="pin" className="size-3" filled /> On the board
              </span>
            ) : (
              <span className={cx(CHIP, "bg-ink text-cream")}>
                <Icon name="lock" className="size-3" /> Only you
              </span>
            )}
            {times.map((t) => (
              <span key={t} className={cx(CHIP, "border-ink/25 bg-white font-mono font-bold")}>
                {t}
              </span>
            ))}
            {people.length > 0 && (
              <span className="flex -space-x-1.5 pl-0.5" aria-label={`About ${people.map((s) => s.name).join(", ")}`}>
                {people.map((s) => (
                  <Face key={s.id} suspect={s} className="size-6 rounded-full border-2 border-ink bg-cream-dk" />
                ))}
              </span>
            )}
          </span>
        </span>
      </button>
      {canPin && (
        <button
          type="button"
          disabled={busy || full}
          onClick={() => act({ type: "pin", evidenceId: evidence.id })}
          aria-label={full ? "The board is full" : `Pin ${evidence.title} to the board`}
          title={full ? "The board is full. Unpin something first." : "Pin to the board"}
          className="absolute top-2.5 right-2.5 grid size-10 place-items-center rounded-full border-2 border-ink bg-coral text-cream shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          <Icon name="pin" className="size-5" />
        </button>
      )}
    </li>
  );
}

type Filter = "all" | "only" | (string & {});

type Layout = "list" | "timeline";
const LAYOUT_KEY = "omc-evidence-layout";
const LAYOUTS: { id: Layout; label: string; icon: IconName }[] = [
  { id: "list", label: "By chapter", icon: "file" },
  { id: "timeline", label: "Timeline", icon: "clock" },
];

function FilterChip({ on, onPick, children }: { on: boolean; onPick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink py-1 pr-3 pl-2.5 text-sm font-extrabold whitespace-nowrap transition-colors",
        on ? "bg-mustard text-ink shadow-pop-sm" : "bg-night/50 text-cream/80 hover:text-cream",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Everything this player can read, in one place: their own pieces and what the
 * team has pinned. Grouped by chapter, newest first, and filtered by who a
 * piece is about.
 */
export function EvidenceShelf({ isNew, onSolve }: { isNew: (e: VisibleEvidence) => boolean; onSolve: () => void }) {
  const { view, open } = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const [layout, setLayout] = useState<Layout>("list");
  const goal = goalOf(view);

  // The list closes every time a piece is acted on, so the layout someone chose is remembered on this device.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(LAYOUT_KEY) === "timeline") setLayout("timeline");
    } catch {}
  }, []);
  const pickLayout = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {}
  };
  const suspects = view.case.suspects;

  const about = useMemo(() => new Map(view.evidence.map((e) => [e.id, new Set(peopleIn(e, suspects).map((s) => s.id))])), [view.evidence, suspects]);
  const onlyMe = (e: VisibleEvidence) => e.mine && !e.pinned;
  const only = view.evidence.filter(onlyMe).length;
  const named = suspects.map((s) => ({ suspect: s, count: view.evidence.filter((e) => about.get(e.id)?.has(s.id)).length })).filter((n) => n.count > 0);

  // A filter that has emptied out (its last piece was pinned) falls back to everything.
  const active: Filter = filter === "only" ? (only ? "only" : "all") : filter === "all" || named.some((n) => n.suspect.id === filter) ? filter : "all";
  const shown = view.evidence.filter((e) => (active === "all" ? true : active === "only" ? onlyMe(e) : about.get(e.id)?.has(active)));
  const chapters = [...new Set(shown.map((e) => e.chapter))].sort((a, b) => b - a);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 pr-12 font-display text-2xl text-cream">
        <Icon name="desk" /> Evidence
        <span className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-sans text-sm font-black text-ink">{view.evidence.length}</span>
      </h2>
      {view.phase === "investigation" && (
        // The question stays in front of the evidence, so every piece is read as "does this prove it?".
        <button type="button" onClick={onSolve} className="mb-3 flex w-full items-center gap-2.5 rounded-2xl border-[3px] border-ink bg-night/60 px-3 py-2 text-left transition-transform hover:-translate-y-0.5">
          <Icon name="target" className="size-5 shrink-0 text-mustard" />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.7rem] font-extrabold tracking-widest text-mustard uppercase">What are we proving?</span>
            <span className="block text-sm leading-snug font-bold text-cream">{goal.question}</span>
          </span>
          <Icon name="arrow" className="size-4 shrink-0 text-cream/60" />
        </button>
      )}

      {view.evidence.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-full border-2 border-ink bg-night/50 p-1" role="group" aria-label="How to lay the evidence out">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={layout === l.id}
              onClick={() => pickLayout(l.id)}
              className={cx("flex items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-extrabold transition-colors", layout === l.id ? "bg-cream text-ink" : "text-cream/75 hover:text-cream")}
            >
              <Icon name={l.icon} className="size-4" /> {l.label}
            </button>
          ))}
        </div>
      )}

      {view.evidence.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1.5 [scrollbar-width:none] sm:-mx-6 sm:px-6" role="group" aria-label="Show evidence about">
          <FilterChip on={active === "all"} onPick={() => setFilter("all")}>
            All <span className="opacity-60">{view.evidence.length}</span>
          </FilterChip>
          {only > 0 && (
            <FilterChip on={active === "only"} onPick={() => setFilter("only")}>
              <Icon name="lock" className="size-4" /> Only you <span className="opacity-60">{only}</span>
            </FilterChip>
          )}
          {named.map(({ suspect, count }) => (
            <FilterChip key={suspect.id} on={active === suspect.id} onPick={() => setFilter(suspect.id)}>
              <Face suspect={suspect} className="-my-0.5 -ml-1.5 size-7 rounded-full border-2 border-ink bg-cream-dk" />
              {shortName(suspect)} <span className="opacity-60">{count}</span>
            </FilterChip>
          ))}
        </div>
      )}

      {layout === "timeline" && view.evidence.length > 0 && <EvidenceTimeline pieces={shown} />}

      {layout === "list" && only > 0 && active !== "only" && view.phase === "investigation" && (
        <button type="button" onClick={() => setFilter("only")} className="mb-4 flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-mustard/70 px-3 py-2 text-left text-sm leading-snug font-bold text-moon">
          <Icon name="lock" className="size-4 shrink-0" />
          <span className="flex-1">
            Only you can see {only === 1 ? "1 piece" : `${only} pieces`}. Pin {only === 1 ? "it" : "them"} or read {only === 1 ? "it" : "them"} out so the team knows.
          </span>
          <Icon name="arrow" className="size-4 shrink-0" />
        </button>
      )}

      {layout === "timeline" && view.evidence.length > 0 ? null : chapters.length ? (
        chapters.map((n) => (
          <div key={n} className="mb-5 last:mb-0">
            <h3 className="mb-2 flex items-baseline gap-2 text-[0.75rem] font-extrabold tracking-widest text-mustard uppercase">
              Chapter {n}
              <span className="truncate tracking-normal text-cream/60 normal-case">{view.case.chapterTitles[n - 1]}</span>
            </h3>
            <ul className="grid gap-2.5">
              {shown
                .filter((e) => e.chapter === n)
                .sort((a, b) => (b.foundAt ?? 0) - (a.foundAt ?? 0))
                .map((e) => (
                  <EvidenceRow key={e.id} evidence={e} fresh={isNew(e)} onOpen={() => open(e.id)} />
                ))}
            </ul>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-cream/25 px-4 py-6 text-center text-sm font-bold text-cream/65">Nothing yet. Use your tool, and what you find lands here.</p>
      )}
    </section>
  );
}
