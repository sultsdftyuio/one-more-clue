"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerView } from "@/lib/game/engine";
import type { SideJobView } from "@/lib/game/helps";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import type { CastMember } from "@/lib/world/cast";
import type { Spot } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import { nearest, stairsFrom, type Reachable } from "@/lib/world/steer";
import { useWorldStore } from "./useWorld";

const LEFT = new Set(["ArrowLeft", "a", "A"]);
const RIGHT = new Set(["ArrowRight", "d", "D"]);
const UP = new Set(["ArrowUp", "w", "W"]);
const DOWN = new Set(["ArrowDown", "s", "S"]);
const USE = new Set(["e", "E", " ", "Enter"]);

/** Keys are for walking only when nothing else wants them: no text box, no open sheet or game. */
function keysAreFree(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return false;
  // A focused button takes Space and Enter itself.
  return !document.querySelector('[role="dialog"]');
}

const roomOf = (plate: WorldPlate, x: number, z: number) => plate.rooms.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 - 10 && z <= r.z1)?.id ?? null;

/**
 * Walking your detective yourself. On a laptop: arrow keys or WASD walk left and right, up and down take the stairs,
 * and E, Space or Enter uses whatever you're standing at. On a phone: hold ◀ or ▶, tap ▲ or ▼ at the stairs, and the
 * round button uses what's in reach. A prompt says what that is ("E · Priya's laptop"). Tapping people and spots
 * still works too; tapping the floor no longer walks you.
 */
export function WorldControls({
  plate,
  view,
  cast,
  mine,
  onSpot,
  onJob,
}: {
  plate: WorldPlate;
  view: PlayerView;
  cast: Record<string, CastMember>;
  mine: string | null;
  onSpot: (spot: WorldSpotView) => void;
  onJob: (job: SideJobView) => void;
}) {
  const store = useWorldStore();
  const [at, setAt] = useState<Spot | null>(null);
  const [touch, setTouch] = useState(false);
  const held = useRef(new Set<string>());
  const playing = view.phase === "investigation";

  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);

  // Where my detective stands, as they move.
  useEffect(() => {
    if (!mine) return;
    const base = plate.people.find((p) => p.id === mine);
    const read = (pos: Spot | undefined) => {
      const spot = pos ?? (base ? { x: base.x, z: base.z } : null);
      setAt((prev) => (spot && prev && Math.abs(prev.x - spot.x) < 4 && prev.z === spot.z ? prev : spot));
    };
    read(store.getState().positions[mine]);
    return store.subscribe((s, prev) => {
      if (s.positions !== prev.positions) read(s.positions[mine]);
    });
  }, [store, mine, plate]);

  const things = useMemo<Reachable[]>(() => {
    if (!playing) return [];
    const list: Reachable[] = [];
    for (const s of view.spots) list.push({ kind: "spot", id: s.id, x: s.x, room: s.room, label: s.name });
    for (const j of view.jobs) if (!j.done) list.push({ kind: "job", id: j.id, x: j.spot.x, room: j.spot.room, label: j.spot.name });
    for (const p of plate.people) {
      if (p.detective || !cast[p.id]) continue;
      const pos = store.getState().positions[p.id] ?? { x: p.x, z: p.z };
      list.push({ kind: "person", id: p.id, x: pos.x, room: roomOf(plate, pos.x, pos.z), label: cast[p.id].name });
    }
    return list;
  }, [playing, view.spots, view.jobs, plate, cast, store]);

  const reach = at ? nearest(plate, at, things) : null;
  const up = at ? stairsFrom(plate, at, 1) : null;
  const down = at ? stairsFrom(plate, at, -1) : null;

  const use = () => {
    if (!reach) return;
    if (reach.kind === "spot") {
      const spot = view.spots.find((s) => s.id === reach.id);
      if (spot) onSpot(spot);
    } else if (reach.kind === "job") {
      const job = view.jobs.find((j) => j.id === reach.id);
      if (job) onJob(job);
    } else {
      store.getState().select(reach.id);
    }
  };
  const useRef_ = useRef(use);
  useRef_.current = use;

  // Keys.
  useEffect(() => {
    if (!mine) return;
    const steer = () => {
      const l = [...held.current].some((k) => LEFT.has(k));
      const r = [...held.current].some((k) => RIGHT.has(k));
      store.getState().setSteer(l === r ? 0 : l ? -1 : 1);
    };
    const down = (e: KeyboardEvent) => {
      if (!keysAreFree(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (LEFT.has(e.key) || RIGHT.has(e.key)) {
        e.preventDefault();
        held.current.add(e.key);
        steer();
      } else if (UP.has(e.key) || DOWN.has(e.key)) {
        e.preventDefault();
        if (!e.repeat) store.getState().requestClimb(UP.has(e.key) ? 1 : -1);
      } else if (USE.has(e.key) && !e.repeat) {
        // Space and Enter on a focused button press the button, as they should.
        if ((e.key === " " || e.key === "Enter") && (e.target as HTMLElement)?.tagName === "BUTTON") return;
        e.preventDefault();
        useRef_.current();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (held.current.delete(e.key)) steer();
    };
    const blur = () => {
      held.current.clear();
      steer();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      store.getState().setSteer(0);
    };
  }, [store, mine]);

  if (!mine) return null;
  const hold = (dir: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      store.getState().setSteer(dir);
    },
    onPointerUp: () => store.getState().setSteer(0),
    onPointerCancel: () => store.getState().setSteer(0),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const pad = "pointer-events-auto grid size-14 touch-none place-items-center rounded-full border-[3px] border-ink bg-cream/90 font-black text-2xl text-ink shadow-pop-sm active:translate-y-0.5 active:bg-mustard";
  const verb = reach?.kind === "person" ? "Talk to" : reach?.kind === "job" ? "Play at" : "Look at";

  return (
    <>
      {/* What's in reach, and the stairs: said in words, with the key that does it. */}
      {(reach || up || down) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(11.5rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-20" aria-live="polite">
          <p className="flex max-w-full items-center gap-2 truncate rounded-full border-2 border-ink bg-night/90 py-1 pr-3 pl-1 text-sm font-extrabold text-cream shadow-pop-sm">
            {reach && (
              <span className="flex min-w-0 items-center gap-1.5">
                {!touch && <kbd className="rounded-md border-2 border-ink bg-mustard px-1.5 font-mono text-xs text-ink">E</kbd>}
                <span className="truncate">
                  {verb} {reach.label}
                </span>
              </span>
            )}
            {(up || down) && (
              <span className="shrink-0 text-cream/80">
                {!touch && <kbd className="rounded-md border-2 border-ink bg-cream px-1.5 font-mono text-xs text-ink">{up ? "↑" : "↓"}</kbd>} {up ? "Upstairs" : "Downstairs"}
              </span>
            )}
          </p>
        </div>
      )}
      {touch && (
        <>
          <div className="pointer-events-none absolute bottom-[calc(11rem+env(safe-area-inset-bottom))] left-3 z-10 flex items-end gap-2">
            <button type="button" aria-label="Walk left" className={pad} {...hold(-1)}>
              ◀
            </button>
            <div className="flex flex-col gap-2">
              {up && (
                <button type="button" aria-label="Go upstairs" className={pad} onClick={() => store.getState().requestClimb(1)}>
                  ▲
                </button>
              )}
              {down && (
                <button type="button" aria-label="Go downstairs" className={pad} onClick={() => store.getState().requestClimb(-1)}>
                  ▼
                </button>
              )}
            </div>
            <button type="button" aria-label="Walk right" className={pad} {...hold(1)}>
              ▶
            </button>
          </div>
          <button
            type="button"
            onClick={use}
            disabled={!reach}
            aria-label={reach ? `${verb} ${reach.label}` : "Nothing in reach"}
            className={cx(
              "pointer-events-auto absolute right-3 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-10 grid size-16 place-items-center rounded-full border-[3px] border-ink font-display text-lg shadow-pop-sm",
              reach ? "bg-mustard text-ink" : "bg-cream/40 text-ink/50",
            )}
          >
            Use
          </button>
        </>
      )}
    </>
  );
}
