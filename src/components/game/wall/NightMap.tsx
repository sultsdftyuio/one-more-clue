"use client";

import { useEffect, useMemo, useState } from "react";
import { formatTime, parseTime } from "@/lib/game/clock";
import type { MapClash, MapSighting, NightMapView } from "@/lib/game/engine";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";
import { Face, shortName } from "../evidence/kinds";
import { usePrefersReducedMotion } from "../evidence/Viewfinder";

/** A token's width, in plan units: the plan is 100 wide, and as many tall as the case says. */
const TOKEN = 9;
const GAP = 1.2;

type Token = { key: string; who: string; room: string; says: boolean; sightings: MapSighting[] };
type Placed = Token & { x: number; y: number };
type Line = { a: string; b: string; clashes: MapClash[] };

/**
 * Who's where at minute `t` of the night. A person caught in two places at once shows in both, joined by
 * the clash; anyone else shows once, in their surest place (a record beats a crack beats a story, and the
 * latest word wins a tie). Two pieces that agree on a room share one token.
 */
export function whereAt(map: NightMapView, t: number) {
  const active = map.sightings.filter((s) => s.from <= t && t <= s.to);
  const live = map.clashes.filter((c) => c.from <= t && t <= c.to && active.some((s) => s.id === c.x) && active.some((s) => s.id === c.y));
  const tokens = new Map<string, Token>();
  const put = (s: MapSighting) => {
    const key = `${s.who}@${s.room}${s.says ? ":says" : ""}`;
    const token = tokens.get(key) ?? { key, who: s.who, room: s.room, says: s.says, sightings: [] };
    if (!token.sightings.some((x) => x.id === s.id)) token.sightings.push(s);
    tokens.set(key, token);
    return key;
  };
  const lines = new Map<string, Line>();
  for (const who of new Set(active.map((s) => s.who))) {
    const clashes = live.filter((c) => c.who === who);
    if (!clashes.length) {
      put(active.filter((s) => s.who === who).sort((x, y) => y.weight - x.weight || y.from - x.from)[0]);
      continue;
    }
    for (const c of clashes) {
      const a = put(active.find((s) => s.id === c.x)!);
      const b = put(active.find((s) => s.id === c.y)!);
      const id = [a, b].sort().join("|");
      const line = lines.get(id) ?? { a, b, clashes: [] };
      line.clashes.push(c);
      lines.set(id, line);
    }
  }
  return { tokens: [...tokens.values()], lines: [...lines.values()] };
}

/** Lays tokens out in their rooms: centred rows under the room's name, or beside it in a narrow room. */
function place(map: NightMapView, tokens: Token[], order: string[]): Placed[] {
  const placed: Placed[] = [];
  for (const room of map.rooms) {
    const here = tokens.filter((t) => t.room === room.id).sort((a, b) => order.indexOf(a.who) - order.indexOf(b.who) || Number(a.says) - Number(b.says));
    if (!here.length) continue;
    const narrow = room.h < 18;
    const left = narrow ? room.x + Math.min(22, room.w * 0.32) : room.x + 1;
    const top = narrow ? room.y : room.y + 7;
    const width = room.x + room.w - 1 - left;
    const height = room.y + room.h - top;
    const cols = Math.max(1, Math.floor((width + GAP) / (TOKEN + GAP)));
    const rows = Math.ceil(here.length / cols);
    const step = Math.min(TOKEN + GAP, rows > 1 ? (height - TOKEN) / (rows - 1) : TOKEN + GAP);
    here.forEach((token, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, here.length - row * cols);
      const col = i % cols;
      const x = left + (width - inRow * (TOKEN + GAP) + GAP) / 2 + col * (TOKEN + GAP) + TOKEN / 2;
      const y = top + (height - ((rows - 1) * step + TOKEN)) / 2 + row * step + TOKEN / 2;
      placed.push({ ...token, x, y });
    });
  }
  return placed;
}

function HaloGlyph() {
  return (
    <svg viewBox="0 0 40 24" className="w-[78%]" aria-hidden>
      <circle cx="11" cy="13" r="8" fill="#5dcaa5" stroke="#1b1f3b" strokeWidth="3" />
      <circle cx="29" cy="13" r="8" fill="#5dcaa5" stroke="#1b1f3b" strokeWidth="3" />
      <path d="M19 12h2" stroke="#1b1f3b" strokeWidth="3" />
    </svg>
  );
}

/**
 * The map of the night: the case's place as a plan, and everyone in it minute by minute, as the team's
 * visible pieces put them. Slide (or play) through the night. When two pieces put one person in two places
 * at once and they really are a contradiction, a red line joins the two; tapping it picks those two pieces
 * for the Archivist to tie, exactly as on the wall.
 */
export function NightMap({
  map,
  suspects,
  selected,
  onPick,
}: {
  map: NightMapView;
  suspects: CaseSuspect[];
  selected: string[];
  onPick: (a: string, b: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const firstOpen = map.clashes.find((c) => !c.caught);
  const [t, setT] = useState(() => (firstOpen ? Math.round((firstOpen.from + firstOpen.to) / 2) : 0));
  const [playing, setPlaying] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const start = parseTime(map.from);
  const order = useMemo(() => [...suspects.map((s) => s.id), ...map.things.map((t) => t.id)], [suspects, map.things]);
  const { tokens, lines } = useMemo(() => whereAt(map, t), [map, t]);
  const placed = useMemo(() => place(map, tokens, order), [map, tokens, order]);
  const at = (key: string) => placed.find((p) => p.key === key);
  const nameOf = (who: string) => {
    const suspect = suspects.find((s) => s.id === who);
    return suspect ? shortName(suspect) : (map.things.find((x) => x.id === who)?.name ?? who);
  };
  const roomName = (id: string) => map.rooms.find((r) => r.id === id)?.name ?? id;
  const pair = selected.length === 2 ? [...selected].sort().join("+") : null;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setT((now) => {
        if (now >= map.span) {
          setPlaying(false);
          return now;
        }
        return now + 1;
      });
    }, 110);
    return () => window.clearInterval(timer);
  }, [playing, map.span]);

  const picked = lines.find((l) => l.clashes.some((c) => [c.a, c.b].sort().join("+") === pair));
  const focused = focus ? placed.find((p) => p.key === focus) : undefined;
  let caption: string;
  if (picked) {
    const c = picked.clashes.find((x) => !x.caught) ?? picked.clashes[0];
    const x = map.sightings.find((s) => s.id === c.x)!;
    const y = map.sightings.find((s) => s.id === c.y)!;
    caption = `${nameOf(c.who)} can't be in two places: ${roomName(x.room)} by "${x.title}", ${roomName(y.room)} by "${y.title}". Tie them.`;
  } else if (focused) {
    caption = `${nameOf(focused.who)}, ${roomName(focused.room)}: ${focused.says ? "says" : "seen"} by ${focused.sightings.map((s) => `"${s.title}"`).join(" and ")}.`;
  } else if (lines.some((l) => l.clashes.some((c) => !c.caught))) {
    caption = "Someone is in two places at once. Tap the red line.";
  } else {
    caption = map.sightings.length ? "Slide through the night and watch everyone move." : "Pin pieces to the wall, and the map fills in with where they put people.";
  }

  return (
    <div data-coach="map">
      <div className="relative w-full overflow-hidden rounded-xl border-[3px] border-ink bg-[#e9e1cc] shadow-pop-sm" style={{ aspectRatio: `100 / ${map.height}` }}>
        <div aria-hidden className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(#c9bfa4 1px, transparent 1px), linear-gradient(90deg, #c9bfa4 1px, transparent 1px)", backgroundSize: "5% 7.2%" }} />
        {map.rooms.map((room) => (
          <div
            key={room.id}
            className={cx(
              "absolute rounded-md border-2",
              room.away ? "border-dashed border-ink/60 bg-[#2a2f52]/85 text-cream" : room.outdoor ? "border-dashed border-ink/50 bg-[#cfd8c0]" : "border-ink bg-[#fbf6ea]",
            )}
            style={{ left: `${room.x}%`, top: `${(room.y / map.height) * 100}%`, width: `${room.w}%`, height: `${(room.h / map.height) * 100}%` }}
          >
            <p className={cx("px-1.5 pt-1 font-display leading-none", room.away ? "text-[clamp(0.6rem,2.4vw,0.85rem)]" : "text-[clamp(0.65rem,2.6vw,0.95rem)] text-ink")}>{room.name}</p>
            {room.note && <p className={cx("px-1.5 text-[clamp(0.5rem,1.9vw,0.7rem)] leading-tight font-bold", room.away ? "text-cream/60" : "text-ink/50")}>{room.note}</p>}
          </div>
        ))}

        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${map.height}`} preserveAspectRatio="none">
          {lines.map((line) => {
            const a = at(line.a);
            const b = at(line.b);
            if (!a || !b) return null;
            const caught = line.clashes.every((c) => c.caught);
            const chosen = line === picked;
            return (
              <line
                key={`${line.a}|${line.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={caught ? "#a23b3b" : "#e05a47"}
                strokeWidth={chosen ? 5 : 3.5}
                strokeDasharray={caught ? undefined : "7 5"}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={cx(!caught && !reduced && "animate-pulse")}
              />
            );
          })}
        </svg>

        {placed.map((p) => {
          const suspect = suspects.find((s) => s.id === p.who);
          const clashing = lines.some((l) => l.a === p.key || l.b === p.key);
          return (
            <button
              key={`${p.who}${p.says ? ":says" : ""}${clashing ? `@${p.room}` : ""}`}
              type="button"
              onClick={() => setFocus((f) => (f === p.key ? null : p.key))}
              aria-label={`${nameOf(p.who)} in ${roomName(p.room)}, ${p.says ? "by their story" : "seen"}`}
              className={cx(
                "absolute grid aspect-square -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full border-[2.5px]",
                p.says ? "border-dashed border-ink/80 bg-cream/70 opacity-80" : "border-ink bg-cream shadow-pop-sm",
                !suspect && "bg-mustard",
                focus === p.key && "ring-4 ring-mustard",
                !reduced && "transition-[left,top] duration-500 ease-out",
              )}
              style={{ left: `${p.x}%`, top: `${(p.y / map.height) * 100}%`, width: `${TOKEN}%` }}
            >
              {suspect ? <Face suspect={suspect} className="size-full" /> : <HaloGlyph />}
            </button>
          );
        })}

        {lines.map((line) => {
          const a = at(line.a);
          const b = at(line.b);
          if (!a || !b) return null;
          const open = line.clashes.find((c) => !c.caught);
          return (
            <button
              key={`mark-${line.a}|${line.b}`}
              type="button"
              disabled={!open}
              onClick={() => {
                if (!open) return;
                play("tap");
                setFocus(null);
                onPick(open.a, open.b);
              }}
              aria-label={open ? `${nameOf(open.who)} is in two places at once: pick the two pieces` : "Caught"}
              className={cx(
                "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[2.5px] border-ink font-display leading-none shadow-pop-sm",
                open ? "size-[clamp(1.5rem,7%,2.2rem)] bg-coral text-[clamp(0.9rem,4vw,1.3rem)] text-cream" : "rotate-[-8deg] rounded-md bg-cream px-1 text-[clamp(0.55rem,2vw,0.75rem)] text-[#a23b3b]",
                line === picked && "ring-4 ring-mustard",
              )}
              style={{ left: `${(a.x + b.x) / 2}%`, top: `${((a.y + b.y) / 2 / map.height) * 100}%` }}
            >
              {open ? "!" : "LIE"}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (t >= map.span) setT(0);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "Pause the night" : "Play the night"}
          className="grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-mustard text-ink shadow-pop-sm"
        >
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
            {playing ? <path d="M5 3h3.5v14H5zM11.5 3H15v14h-3.5z" fill="currentColor" /> : <path d="M5 3l12 7-12 7z" fill="currentColor" />}
          </svg>
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={map.span}
            step={1}
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            aria-label="Time of night"
            className="w-full accent-coral"
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-1 h-2">
            {map.clashes.map((c, i) => (
              <span key={i} className={cx("absolute size-2 -translate-x-1/2 rounded-full", c.caught ? "bg-[#a23b3b]/50" : "bg-coral")} style={{ left: `${((c.from + c.to) / 2 / map.span) * 100}%` }} />
            ))}
          </div>
        </div>
        <span className="w-[5.5rem] shrink-0 text-right font-printer text-2xl leading-none text-cream">{formatTime(start + t, map.from)}</span>
      </div>

      <p className="mt-2 min-h-10 text-sm leading-snug font-bold text-cream/85" aria-live="polite">
        {caption}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-cream/60">
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full border-2 border-cream bg-cream/80" /> Seen: a record, a camera, a witness
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full border-2 border-dashed border-cream" /> Says: someone&apos;s story
        </span>
      </p>
    </div>
  );
}
