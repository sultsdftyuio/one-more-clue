"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { nameOf, type Act } from "@/components/game/context";
import { Icon } from "@/components/game/ui/Icon";
import { formatTime, parseTime } from "@/lib/game/clock";
import type { NightMapView, PlayerView } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { plateToScreen } from "@/lib/world/camera";
import { toPlate } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import { ghostsAt } from "@/lib/world/rewind";
import type { WorldState } from "@/lib/world/store";
import { useWorld, useWorldStore } from "./useWorld";

/** Who a sighting is about: a suspect's name, or a thing's (HALO). */
function whoName(view: PlayerView, map: NightMapView, who: string) {
  return view.case.suspects.find((s) => s.id === who)?.name.split(" ").at(-1) ?? map.things.find((t) => t.id === who)?.name ?? who;
}

/** The time at a minute of the night, written the way the case writes times. */
const clockAt = (map: NightMapView, minute: number) => formatTime(parseTime(map.from) + minute, map.from);

/** The rewind's own button, for the camera row. */
export function RewindButton({ className }: { className: string }) {
  const open = useWorld((s) => s.rewind.open);
  const openRewind = useWorld((s) => s.openRewind);
  if (open) return null;
  return (
    <button type="button" onClick={() => openRewind(true)} className={className} aria-label="Rewind the night" title="Rewind the night">
      <Icon name="rewind" className="size-5" />
    </button>
  );
}

/**
 * The rewind's controls (W4.2, W4.3), over the dock while it's open: drag through the night, play it, and, for the
 * Archivist, share it (their slider pulls everyone's along) and Freeze it on one moment for the whole team. Who the
 * evidence puts somewhere off the building (gone home, across town) is listed here.
 */
export function RewindBar({ view, map }: { view: PlayerView; map: NightMapView }) {
  const rewind = useWorld((s) => s.rewind);
  const drag = useWorld((s) => s.dragRewind);
  const freeze = useWorld((s) => s.freezeRewind);
  const close = useWorld((s) => s.openRewind);
  const archivist = view.me.abilities.includes("crosscheck");
  const locked = Boolean(rewind.frozenBy && rewind.frozenBy !== view.me.id);
  const [playing, setPlaying] = useState(false);
  const minute = Math.min(map.span, Math.max(0, rewind.minute));

  useEffect(() => {
    if (!playing || locked) return;
    const timer = window.setInterval(() => {
      const next = minute + 1;
      if (next > map.span) setPlaying(false);
      else drag(next, view.me.id, archivist);
    }, 220);
    return () => window.clearInterval(timer);
  }, [playing, locked, minute, map.span, drag, view.me.id, archivist]);

  // Only which rooms are off the building matters here; the building's own boxes are the scene's business.
  const rooms = useMemo(
    () => map.rooms.map((r) => ({ id: r.id, name: r.name, kind: r.away ? ("away" as const) : ("inside" as const), box: r.away ? undefined : { x0: 0, x1: 1, z0: 0, z1: 1 } })),
    [map.rooms],
  );
  const { elsewhere } = useMemo(() => ghostsAt(map.sightings, { rooms, links: [] }, minute), [map.sightings, rooms, minute]);

  return (
    <section
      aria-label="Rewind the night"
      className="fixed inset-x-3 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-2xl rounded-3xl border-[3px] border-ink bg-[#121a33]/95 p-3 text-cream shadow-card"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xl font-bold text-[#bfeaff]" aria-live="polite">
          {clockAt(map, minute)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-cream/70">
          {rewind.frozenBy
            ? rewind.frozenBy === view.me.id
              ? "You froze the night for the team"
              : `${nameOf(view, rewind.frozenBy)} froze the night here`
            : rewind.following
              ? `Following ${nameOf(view, rewind.following)}`
              : "Ghosts go where the evidence puts them"}
        </span>
        <button
          type="button"
          disabled={locked}
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause" : "Play the night"}
          className="grid size-9 place-items-center rounded-full border-2 border-ink bg-cream font-black text-ink disabled:opacity-40"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        {archivist && (
          <button
            type="button"
            onClick={() => freeze(view.me.id, rewind.frozenBy !== view.me.id)}
            aria-pressed={rewind.frozenBy === view.me.id}
            className={cx("rounded-full border-2 border-ink px-3 py-1 text-sm font-extrabold", rewind.frozenBy === view.me.id ? "bg-[#bfeaff] text-ink" : "bg-mustard text-ink")}
          >
            {rewind.frozenBy === view.me.id ? "Unfreeze" : "Freeze"}
          </button>
        )}
        <button
          type="button"
          disabled={Boolean(rewind.frozenBy)}
          onClick={() => close(false)}
          aria-label="Back to now"
          className="grid size-9 place-items-center rounded-full bg-night/70 text-cream disabled:opacity-40"
        >
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={map.span}
        step={1}
        value={minute}
        disabled={locked}
        onChange={(e) => drag(Number(e.target.value), view.me.id, archivist)}
        aria-label="The night"
        aria-valuetext={clockAt(map, minute)}
        className="mt-2 w-full accent-[#bfeaff] disabled:opacity-50"
      />
      <div className="flex justify-between font-mono text-[11px] font-bold text-cream/60">
        <span>{map.from}</span>
        <span>{map.to}</span>
      </div>
      {elsewhere.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Elsewhere">
          {elsewhere.map((e) => (
            <li key={`${e.who}:${e.room}`} className={cx("rounded-full border px-2 py-0.5 text-xs font-bold", e.says ? "border-dashed border-[#d8c8ff] text-[#d8c8ff]" : "border-[#bfeaff] text-[#bfeaff]")}>
              {whoName(view, map, e.who)} · {e.name.toLowerCase()}
              {e.says ? " (says so)" : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Over the building while the rewind is open (W4.2, W4.4): a label on each ghost, seen or only said; things like HALO
 * as a glowing marker; and each clash the team has the pieces for drawn as a red line between the two places one
 * person can't both be in, with "can't both be true". The Archivist ties it there, as on the wall.
 */
export function RewindOverlay({ plate, view, act }: { plate: WorldPlate; view: PlayerView; act: Act }) {
  const store = useWorldStore();
  const open = useWorld((s) => s.rewind.open);
  const ghosts = useWorld((s) => s.ghosts);
  const minute = useWorld((s) => s.rewind.minute);
  const map = view.rewind;
  const nodes = useRef(new Map<string, HTMLElement>());
  const lines = useRef(new Map<string, SVGLineElement>());
  const archivist = view.me.abilities.includes("crosscheck");
  const seen = useMemo(() => new Set(view.evidence.map((e) => e.id)), [view.evidence]);

  // A clash shows while its places hold a ghost of that person: a line between two places in the building, or, when
  // the other place is off it (gone home), a label on the one that's here saying where else they're put.
  const clashes = useMemo(() => {
    if (!map) return [];
    const roomOf = new Map(map.sightings.map((s) => [s.id, s.room]));
    const away = (room: string | undefined) => map.rooms.find((r) => r.id === room && r.away)?.name ?? null;
    return map.clashes
      .filter((c) => c.from <= minute && minute <= c.to)
      .flatMap((c) => {
        const a = ghosts.find((g) => g.who === c.who && g.room === roomOf.get(c.x));
        const b = ghosts.find((g) => g.who === c.who && g.room === roomOf.get(c.y));
        const key = `${c.a}:${c.b}:${c.who}`;
        if (a && b) return [{ ...c, ga: a, gb: b, elsewhere: null as string | null, key }];
        const here = a ?? b;
        const there = away(roomOf.get(a ? c.y : c.x));
        return here && there ? [{ ...c, ga: here, gb: here, elsewhere: there, key }] : [];
      });
  }, [map, ghosts, minute]);

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      const screen = (x: number, z: number) => {
        const p = toPlate(plate, x, z);
        return plateToScreen(s.camera, s.viewport, p.x, p.y);
      };
      for (const g of s.ghosts) {
        const node = nodes.current.get(`${g.who}:${g.room}`);
        if (!node) continue;
        const thing = !plate.people.some((p) => p.suspect === g.who);
        const at = screen(g.x, thing ? g.z + 90 : g.z + 200);
        node.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      for (const c of clashes) {
        const line = lines.current.get(c.key);
        const label = nodes.current.get(`clash:${c.key}`);
        const a = screen(c.ga.x, c.ga.z + 100);
        const b = screen(c.gb.x, c.gb.z + 100);
        line?.setAttribute("x1", String(a.x));
        line?.setAttribute("y1", String(a.y));
        line?.setAttribute("x2", String(b.x));
        line?.setAttribute("y2", String(b.y));
        // With only one place in the building, the label sits just under that ghost's own label.
        const thing = !plate.people.some((p) => p.suspect === c.ga.who);
        const under = c.elsewhere ? screen(c.ga.x, thing ? c.ga.z + 90 : c.ga.z + 200) : null;
        if (label) label.style.transform = under ? `translate3d(${under.x.toFixed(1)}px, ${(under.y + 6).toFixed(1)}px, 0) translate(-50%, 0)` : `translate3d(${((a.x + b.x) / 2).toFixed(1)}px, ${((a.y + b.y) / 2).toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.ghosts !== prev.ghosts) place(s);
    });
  }, [store, plate, clashes]);

  if (!open || !map) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 size-full" aria-hidden="true">
        {clashes.filter((c) => !c.elsewhere).map((c) => (
          <line
            key={c.key}
            ref={(node) => {
              if (node) lines.current.set(c.key, node);
              else lines.current.delete(c.key);
            }}
            stroke={c.caught ? "#3fb8af" : "#ef5b5b"}
            strokeWidth={4}
            strokeDasharray="10 7"
            strokeLinecap="round"
          />
        ))}
      </svg>
      {ghosts.map((g) => {
        const thing = !plate.people.some((p) => p.suspect === g.who);
        return (
          <span
            key={`${g.who}:${g.room}`}
            ref={(node) => {
              if (node) nodes.current.set(`${g.who}:${g.room}`, node);
              else nodes.current.delete(`${g.who}:${g.room}`);
            }}
            title={g.title}
            className={cx(
              "absolute top-0 left-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap will-change-transform",
              g.says ? "border border-dashed border-[#d8c8ff] bg-[#1b1530]/85 text-[#d8c8ff]" : "border border-[#bfeaff] bg-[#0f2236]/85 text-[#bfeaff]",
              thing && "shadow-[0_0_14px_4px_rgba(191,234,255,0.55)]",
            )}
          >
            {thing && <Icon name="eye" className="size-3" />}
            {whoName(view, map, g.who)} · {g.walking ? "on the way" : g.says ? "says so" : "seen"}
          </span>
        );
      })}
      {clashes.map((c) => (
        <div
          key={`clash:${c.key}`}
          ref={(node) => {
            if (node) nodes.current.set(`clash:${c.key}`, node);
            else nodes.current.delete(`clash:${c.key}`);
          }}
          className="pointer-events-auto absolute top-0 left-0 flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral px-2.5 py-1 text-xs font-extrabold whitespace-nowrap text-cream shadow-pop-sm will-change-transform"
        >
          {c.caught ? "Caught: can't both be true" : "Can't both be true"}
          {c.elsewhere && <span className="font-semibold">: also {c.elsewhere.toLowerCase()}</span>}
          {/* The Archivist can only tie pieces they can see, as on the wall: otherwise, ask for them on the board. */}
          {archivist && !c.caught && (seen.has(c.a) && seen.has(c.b) ? (
            <button type="button" onClick={() => void act({ type: "crosscheck", a: c.a, b: c.b })} className="rounded-full bg-cream px-2 text-ink">
              Tie them
            </button>
          ) : (
            <span className="font-semibold">· pin both to tie them</span>
          ))}
        </div>
      ))}
    </div>
  );
}
