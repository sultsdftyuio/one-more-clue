"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PlayerView } from "@/lib/game/engine";
import type { SideJobView } from "@/lib/game/helps";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import type { CastMember } from "@/lib/world/cast";
import type { Spot } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import { inReach, stairsFrom, type Reachable } from "@/lib/world/steer";
import { play } from "@/components/game/audio/sound";
import { Icon } from "@/components/game/ui/Icon";
import { plateToScreen } from "@/lib/world/camera";
import { spriteOf, toPlate } from "@/lib/world/geometry";
import type { WorldState } from "@/lib/world/store";
import { useWorld, useWorldStore } from "./useWorld";

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
  onPerson,
}: {
  plate: WorldPlate;
  view: PlayerView;
  cast: Record<string, CastMember>;
  mine: string | null;
  onSpot: (spot: WorldSpotView) => void;
  onJob: (job: SideJobView) => void;
  /** E on a person: question them (the Interviewer) or show their card. */
  onPerson: (personId: string) => void;
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

  const reachable = at ? inReach(plate, at, things) : [];
  const reach = reachable[0] ?? null;
  const [choosing, setChoosing] = useState(false);
  const reachKey = reachable.map((t) => t.id).join("|");
  useEffect(() => setChoosing(false), [reachKey]);
  useEffect(() => {
    store.getState().setNear(reach ? { kind: reach.kind, id: reach.id } : null);
  }, [store, reach?.kind, reach?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = at ? stairsFrom(plate, at, 1) : null;
  const down = at ? stairsFrom(plate, at, -1) : null;

  const activate = (thing: Reachable | null) => {
    setChoosing(false);
    const reach = thing;
    if (!reach) return;
    if (reach.kind === "spot") {
      const spot = view.spots.find((s) => s.id === reach.id);
      if (spot) onSpot(spot);
    } else if (reach.kind === "job") {
      const job = view.jobs.find((j) => j.id === reach.id);
      if (job) onJob(job);
    } else if (store.getState().selected === reach.id) {
      store.getState().select(null);
    } else {
      onPerson(reach.id);
    }
  };

  // A suspect's card closes once you walk away from them.
  useEffect(() => {
    if (!mine) return;
    return store.subscribe((s, prev) => {
      if (s.positions === prev.positions || !s.selected) return;
      const person = plate.people.find((p) => p.id === s.selected);
      if (!person || person.detective) return;
      const me = s.positions[mine];
      const them = s.positions[person.id] ?? person;
      if (me && Math.abs(me.x - them.x) > 160) s.select(null);
    });
  }, [store, mine, plate]);
  const use = () => {
    if (reachable.length > 1 && !choosing) {
      setChoosing(true);
      play("tap");
      return;
    }
    activate(reach);
  };
  const pick = useRef((n: number) => activate(reachable[n] ?? null));
  pick.current = (n: number) => activate(reachable[n] ?? null);
  const choosingRef = useRef(choosing);
  choosingRef.current = choosing;
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
      } else if (choosingRef.current && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        pick.current(Number(e.key) - 1);
      } else if (e.key === "Escape") {
        store.getState().select(null);
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
      {/* What's in reach: a key bubble floating over the thing itself; the stairs: an arrow over your own head. */}
      <KeyBubble plate={plate} reach={reach} more={reachable.length - 1} mine={mine} touch={touch} stairs={up ? 1 : down ? -1 : 0} />
      {choosing && reachable.length > 1 && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-fit max-w-full rounded-3xl border-[3px] border-ink bg-night/95 p-2 shadow-card" role="menu" aria-label="What to use">
          <ul className="flex flex-wrap justify-center gap-2">
            {reachable.slice(0, 6).map((t, i) => (
              <li key={`${t.kind}-${t.id}`}>
                <button
                  type="button"
                  role="menuitem"
                  autoFocus={i === 0}
                  onClick={() => activate(t)}
                  className="world-pop flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-cream py-1.5 pr-3 pl-1.5 text-left font-extrabold text-ink shadow-pop-sm hover:bg-mustard"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-ink text-cream">
                    {!touch ? <span className="font-mono text-sm">{i + 1}</span> : <Icon name={t.kind === "person" ? "chat" : t.kind === "job" ? "play" : "eye"} className="size-4" />}
                  </span>
                  <span className="max-w-[11rem] truncate">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {touch && (
        <>
          <div className="pointer-events-none absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-10 flex items-end gap-2">
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
              "pointer-events-auto absolute right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 grid size-16 place-items-center rounded-full border-[3px] border-ink font-display text-lg shadow-pop-sm",
              reach ? "bg-mustard text-ink" : "bg-cream/40 text-ink/50",
            )}
          >
            <Icon name={reach?.kind === "person" ? "chat" : reach?.kind === "job" ? "play" : "eye"} className="size-7" />
          </button>
        </>
      )}
    </>
  );
}

/**
 * The key bubble over whatever's in reach (E, or a tap on phones) with what it does as a picture: an eye to look,
 * a speech bubble to talk, a play button for a side job. At the stairs, an arrow over your own head says which way
 * they go. Placed from world coordinates as the camera moves, like the name tags.
 */
function KeyBubble({ plate, reach, more, mine, touch, stairs }: { plate: WorldPlate; reach: Reachable | null; more: number; mine: string; touch: boolean; stairs: number }) {
  const store = useWorldStore();
  const thing = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLDivElement>(null);
  const rewinding = useWorld((s) => s.rewind.open);
  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      if (thing.current && reach) {
        let p: { x: number; y: number };
        const person = reach.kind === "person" ? plate.people.find((q) => q.id === reach.id) : undefined;
        if (person) {
          const { feet, box } = spriteOf(plate, person, s.positions[person.id]);
          p = { x: feet.x, y: box.y - 10 };
        } else {
          const z = reach.kind === "job" ? (s.view?.jobs.find((j) => j.id === reach.id)?.spot.z ?? 0) : (s.view?.spots.find((q) => q.id === reach.id)?.z ?? 0);
          const at = toPlate(plate, reach.x, z);
          p = { x: at.x, y: at.y - 70 };
        }
        const sc = plateToScreen(s.camera, s.viewport, p.x, p.y);
        thing.current.style.transform = `translate3d(${sc.x.toFixed(1)}px, ${sc.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
      if (arrow.current && stairs) {
        const me = plate.people.find((q) => q.id === mine);
        if (me) {
          const { feet, box } = spriteOf(plate, me, s.positions[mine]);
          const sc = plateToScreen(s.camera, s.viewport, feet.x, box.y - 30);
          arrow.current.style.transform = `translate3d(${sc.x.toFixed(1)}px, ${sc.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.positions !== prev.positions) place(s);
    });
  }, [store, plate, reach, mine, stairs]);
  const icon = reach?.kind === "person" ? "chat" : reach?.kind === "job" ? "play" : "eye";
  const verb = reach?.kind === "person" ? "Talk to" : reach?.kind === "job" ? "Play at" : "Look at";
  if (rewinding) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-live="polite">
      {reach && (
        <div ref={thing} key={`${reach.kind}-${reach.id}`} className="absolute top-0 left-0 will-change-transform">
          <span className="world-bubble flex items-center gap-1 rounded-2xl border-[3px] border-ink bg-cream px-1.5 py-1 text-ink shadow-pop-sm">
            {!touch && <kbd className="grid size-6 place-items-center rounded-lg border-2 border-ink bg-mustard font-mono text-sm font-black">E</kbd>}
            <Icon name={icon} className="size-5" />
            {more > 0 && <span className="rounded-full bg-ink px-1.5 text-xs font-black text-cream">+{more}</span>}
            <span className="sr-only">
              {verb} {reach.label}
              {more > 0 ? `, and ${more} more nearby` : ""}
            </span>
          </span>
        </div>
      )}
      {stairs !== 0 && (
        <div ref={arrow} className="absolute top-0 left-0 will-change-transform">
          <span className="world-fresh flex items-center gap-1 rounded-2xl border-[3px] border-ink bg-teal px-1.5 py-1 text-ink shadow-pop-sm">
            {!touch && <kbd className="grid size-6 place-items-center rounded-lg border-2 border-ink bg-cream font-mono text-sm font-black">{stairs > 0 ? "↑" : "↓"}</kbd>}
            <Icon name={stairs > 0 ? "up" : "down"} className="size-5" />
            <span className="sr-only">{stairs > 0 ? "Stairs up" : "Stairs down"}</span>
          </span>
        </div>
      )}
    </div>
  );
}
