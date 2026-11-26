"use client";

import { play } from "@/components/game/audio/sound";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

/** Minutes a step button moves the tape. */
const STEP = 5;

/**
 * The rewind's controls (W4.2, W4.3), like a tape deck over the dock: step back, play, step on, and a tape track with a
 * notch for every moment the team's evidence covers (blue where it was seen, lilac where it's only someone's story),
 * hour marks and a playhead. The Archivist shares their tape (their slider pulls everyone's along) and can Freeze the
 * night on one moment for the team. Who the evidence puts somewhere off the building is listed under it. Opening it
 * spins the night back from its end to its start, so it feels like rewinding.
 */
export function RewindBar({ view, map }: { view: PlayerView; map: NightMapView }) {
  const rewind = useWorld((s) => s.rewind);
  const drag = useWorld((s) => s.dragRewind);
  const freeze = useWorld((s) => s.freezeRewind);
  const close = useWorld((s) => s.openRewind);
  const look = useWorld((s) => s.look);
  const me = useWorld((s) => s.me);
  const archivist = view.me.abilities.includes("crosscheck");
  const locked = Boolean(rewind.frozenBy && rewind.frozenBy !== view.me.id);
  const [playing, setPlaying] = useState(false);
  // The night is seen whole: the camera pulls back to the whole building while the tape runs.
  useEffect(() => {
    look({ kind: "whole" });
  }, [look]);
  const minute = Math.min(map.span, Math.max(0, rewind.minute));
  const set = useCallback((m: number) => drag(Math.min(map.span, Math.max(0, Math.round(m))), view.me.id, archivist), [drag, map.span, view.me.id, archivist]);

  // Opening: the night spins back from its end to where the tape starts.
  const spun = useRef(false);
  useEffect(() => {
    if (spun.current || locked || rewind.following) return;
    spun.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    play("whoosh");
    const start = performance.now();
    const target = minute;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      set(map.span - (map.span - target) * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Once, when the rewind opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing || locked) return;
    const timer = window.setInterval(() => {
      const next = minute + 1;
      if (next > map.span) setPlaying(false);
      else set(next);
    }, 200);
    return () => window.clearInterval(timer);
  }, [playing, locked, minute, map.span, set]);

  // Only which rooms are off the building matters here; the building's own boxes are the scene's business.
  const rooms = useMemo(
    () => map.rooms.map((r) => ({ id: r.id, name: r.name, kind: r.away ? ("away" as const) : ("inside" as const), box: r.away ? undefined : { x0: 0, x1: 1, z0: 0, z1: 1 } })),
    [map.rooms],
  );
  const { elsewhere } = useMemo(() => ghostsAt(map.sightings, { rooms, links: [] }, minute), [map.sightings, rooms, minute]);
  // A notch for each moment on the tape, and a mark every half hour.
  const notches = useMemo(() => {
    const seen = new Map<number, boolean>();
    for (const s of map.sightings) seen.set(s.from, (seen.get(s.from) ?? false) || !s.says);
    return [...seen.entries()].map(([m, solid]) => ({ m, solid }));
  }, [map.sightings]);
  const marks = useMemo(() => {
    const out: { m: number; label: string }[] = [];
    for (let m = 0; m <= map.span; m += 30) out.push({ m, label: clockAt(map, m) });
    return out;
  }, [map]);
  const pct = (m: number) => `${((m / Math.max(1, map.span)) * 100).toFixed(2)}%`;
  const deck = "grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-[#d9ecff] text-[#0b1530] shadow-pop-sm disabled:opacity-40 active:translate-y-0.5";

  return (
    <section
      aria-label="Rewind the night"
      className="fixed inset-x-3 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-2xl rounded-[1.6rem] border-[3px] border-ink bg-[linear-gradient(#1a2546,#0d1430)] p-3 text-[#d9ecff] shadow-card"
    >
      <div className="flex items-center gap-2">
        <button type="button" disabled={locked} onClick={() => set(minute - STEP)} aria-label={`Back ${STEP} minutes`} className={deck}>
          <Icon name="rewind" className="size-5" />
        </button>
        <button type="button" disabled={locked} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play the night"} className={cx(deck, "size-12 bg-[#8fe3ff]")}>
          {playing ? (
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <Icon name="play" className="size-5" />
          )}
        </button>
        <button type="button" disabled={locked} onClick={() => set(minute + STEP)} aria-label={`On ${STEP} minutes`} className={deck}>
          <Icon name="rewind" className="size-5 rotate-180" />
        </button>
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-[#d9ecff]/70">
          {rewind.frozenBy
            ? rewind.frozenBy === view.me.id
              ? "You froze the night for the team"
              : `${nameOf(view, rewind.frozenBy)} froze the night here`
            : rewind.following
              ? `Following ${nameOf(view, rewind.following)}'s tape`
              : "Ghosts go only where the evidence puts them"}
        </p>
        {archivist && (
          <button
            type="button"
            onClick={() => freeze(view.me.id, rewind.frozenBy !== view.me.id)}
            aria-pressed={rewind.frozenBy === view.me.id}
            className={cx("shrink-0 rounded-full border-[3px] border-ink px-3 py-1.5 text-sm font-extrabold shadow-pop-sm", rewind.frozenBy === view.me.id ? "bg-[#8fe3ff] text-ink" : "bg-mustard text-ink")}
          >
            {rewind.frozenBy === view.me.id ? "Unfreeze" : "Freeze for all"}
          </button>
        )}
        <button
          type="button"
          disabled={Boolean(rewind.frozenBy)}
          onClick={() => {
            close(false);
            look(me ? { kind: "person", id: me } : { kind: "closeUp" });
          }}
          aria-label="Back to now"
          title="Back to now"
          className="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-coral text-cream shadow-pop-sm disabled:opacity-40"
        >
          <Icon name="x" className="size-4" />
        </button>
      </div>

      {/* The tape: notches for the evidence's moments, half-hour marks, and the playhead. */}
      <div className="relative mt-3 h-14">
        <div className="absolute inset-x-0 top-3 h-6 overflow-hidden rounded-lg border-2 border-ink bg-[repeating-linear-gradient(90deg,#24325e_0_14px,#1d2a52_14px_16px)]">
          <div className="absolute inset-y-0 left-0 bg-[#8fe3ff]/25" style={{ width: pct(minute) }} />
          {notches.map((n) => (
            <span
              key={n.m}
              aria-hidden="true"
              className={cx("absolute top-0.5 bottom-0.5 w-1.5 -translate-x-1/2 rounded-full", n.solid ? "bg-[#8fe3ff]" : "border border-dashed border-[#c9b5ff] bg-transparent")}
              style={{ left: pct(n.m) }}
            />
          ))}
        </div>
        {marks.map((m) => (
          <span key={m.m} aria-hidden="true" className="absolute top-10 -translate-x-1/2 font-mono text-[11px] font-bold whitespace-nowrap text-[#d9ecff]/60" style={{ left: pct(m.m) }}>
            {m.label}
          </span>
        ))}
        <span aria-hidden="true" className="pointer-events-none absolute top-0 h-12 w-1 -translate-x-1/2 rounded-full bg-mustard shadow-[0_0_10px_2px_rgba(242,179,61,0.7)]" style={{ left: pct(minute) }}>
          <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-mustard" />
        </span>
        <input
          type="range"
          min={0}
          max={map.span}
          step={1}
          value={minute}
          disabled={locked}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="The night"
          aria-valuetext={clockAt(map, minute)}
          className="absolute inset-x-0 top-1 h-10 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>

      {elsewhere.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Elsewhere">
          {elsewhere.map((e) => (
            <li key={`${e.who}:${e.room}`} className={cx("rounded-full border px-2 py-0.5 text-xs font-bold", e.says ? "border-dashed border-[#c9b5ff] text-[#c9b5ff]" : "border-[#8fe3ff] text-[#8fe3ff]")}>
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
 * The tape look over the whole screen while the rewind is open: scanlines, a dark vignette, a blinking "◀◀ REWIND"
 * in the corner and the night's time large at the top, like a tape's on-screen display.
 */
export function RewindScreen({ view }: { view: PlayerView }) {
  const open = useWorld((s) => s.rewind.open);
  const minute = useWorld((s) => s.rewind.minute);
  const frozen = useWorld((s) => Boolean(s.rewind.frozenBy));
  const map = view.rewind;
  if (!open || !map) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <div className="world-scanlines absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,8,22,0.7))]" />
      <div className="world-tracking absolute inset-x-0 h-10 bg-[linear-gradient(transparent,rgba(217,236,255,0.10),transparent)]" />
      <p className="world-osd absolute top-16 left-4 font-mono text-xl font-black tracking-widest text-[#d9ecff] sm:top-20">{frozen ? "❚❚ FROZEN" : "◀◀ REWIND"}</p>
      <p className="absolute top-14 left-1/2 -translate-x-1/2 font-mono text-4xl font-black tracking-wider text-[#d9ecff] [text-shadow:0_0_14px_rgba(143,227,255,0.8),2px_2px_0_#0b1530] sm:text-5xl">
        {clockAt(map, Math.min(map.span, Math.max(0, minute)))}
      </p>
    </div>
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
