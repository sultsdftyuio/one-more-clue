"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { nameOf, type Act } from "@/components/game/context";
import { buzz, BUZZ } from "@/components/game/haptics";
import type { PlayerView } from "@/lib/game/engine";
import type { SideJobView } from "@/lib/game/helps";
import { cx } from "@/lib/cx";
import { plateToScreen } from "@/lib/world/camera";
import { toPlate } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";
import { HELP_LOOK, HelpMark } from "./jobs/frame";
import { coverRoom } from "./overRoom";
import { useWorldStore } from "./useWorld";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Side-job spots in the building (W6.1): a small round marker with the help it wins, bobbing gently, on everyone's
 * phone. One done this chapter turns grey with a tick. DOM placed from world coordinates, like the other spots.
 */
export function WorldJobs({ plate, view, onOpen }: { plate: WorldPlate; view: PlayerView; onOpen: (job: SideJobView) => void }) {
  const store = useWorldStore();
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const jobs = view.jobs;

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      const shown = s.viewport.w > 0 ? clamp((s.camera.zoom / s.range.closeUp - 0.45) / 0.2, 0, 1) : 0;
      for (const job of jobs) {
        const node = nodes.current.get(job.id);
        if (!node) continue;
        const p = toPlate(plate, job.spot.x, job.spot.z);
        const at = plateToScreen(s.camera, s.viewport, p.x, p.y);
        node.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        node.style.opacity = String(shown);
        node.style.visibility = shown > 0.05 ? "visible" : "hidden";
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.range !== prev.range) place(s);
    });
  }, [store, jobs, plate]);

  if (view.phase !== "investigation") return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {jobs.map((job) => {
        const look = HELP_LOOK[job.help];
        const done = job.done;
        return (
          <button
            key={job.id}
            ref={(node) => {
              if (node) nodes.current.set(job.id, node);
              else nodes.current.delete(job.id);
            }}
            type="button"
            onClick={() => !done && onOpen(job)}
            aria-label={done ? `${job.spot.name}: done${done.by ? ` by ${nameOf(view, done.by)}` : ""}` : `${job.spot.name}: a side job that wins ${look.label === "Sore spot" ? "a sore spot" : `a ${look.label.toLowerCase()}`}`}
            aria-disabled={Boolean(done)}
            style={{ visibility: "hidden" }}
            className="pointer-events-auto absolute top-0 left-0 grid size-11 place-items-center will-change-transform"
          >
            <span className={cx("relative grid place-items-center", !done && "world-fresh")}>
              <HelpMark help={job.help} className={cx("size-8 shadow-pop-sm", done && "opacity-40 grayscale")} />
              {done && <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border border-ink bg-teal text-[10px] font-black text-ink">✓</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A Lightbulb's glow (W6.2): a warm light pulsing over each lit room until it's searched out. It lights a room, not the clue. */
export function WorldGlow({ plate, view }: { plate: WorldPlate; view: PlayerView }) {
  const store = useWorldStore();
  const key = view.phase === "investigation" ? view.helps.lit.join("|") : "";
  const lit = useMemo(() => (key ? key.split("|") : []), [key]);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  useLayoutEffect(() => {
    const place = (s: WorldState) => lit.forEach((room) => nodes.current.get(room) && coverRoom(nodes.current.get(room)!, plate, s, room));
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport) place(s);
    });
  }, [store, plate, lit]);
  if (!lit.length) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {lit.map((room) => (
        <div
          key={room}
          ref={(node) => {
            if (node) nodes.current.set(room, node);
            else nodes.current.delete(room);
          }}
          style={{ visibility: "hidden" }}
          className="world-glow absolute top-0 left-0 rounded-md will-change-transform"
        />
      ))}
    </div>
  );
}

/** The team's helps in the HUD (W6.2): cups of coffee, glowing rooms, sore spots. Hidden until there's one. */
export function HelpsChip({ view }: { view: PlayerView }) {
  const { coffee, lit, sore } = view.helps;
  if (!coffee && !lit.length && !sore.length) return null;
  const parts = [coffee ? `${coffee} coffee${coffee > 1 ? "s" : ""}` : null, lit.length ? `${lit.length} lit room${lit.length > 1 ? "s" : ""}` : null, sore.length ? `${sore.length} sore spot${sore.length > 1 ? "s" : ""}` : null].filter(Boolean);
  return (
    <p aria-label={`Team helps: ${parts.join(", ")}`} className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border-2 border-ink/80 bg-night/90 px-2 py-1 text-xs font-extrabold text-cream">
      {coffee > 0 && (
        <span className="flex items-center gap-0.5">
          <HelpMark help="coffee" className="size-5" />
          {coffee}
        </span>
      )}
      {lit.length > 0 && (
        <span className="flex items-center gap-0.5">
          <HelpMark help="lightbulb" className="size-5" />
          {lit.length}
        </span>
      )}
      {sore.length > 0 && (
        <span className="flex items-center gap-0.5">
          <HelpMark help="sore-spot" className="size-5" />
          {sore.length}
        </span>
      )}
    </p>
  );
}

/**
 * Lights out (W6.4): the storm cuts the power for everyone at once. The building goes dark on every phone, each
 * player gets their own fuse to flip, and the team sees whose are done. The lights come back when everyone has, or
 * after 20 seconds anyway: there's no failing it, only fewer glowing rooms.
 */
export function LightsOut({ view, act }: { view: PlayerView; act: Act }) {
  const event = view.event;
  const [now, setNow] = useState(() => Date.now());
  const [up, setUp] = useState(0);
  const drag = useRef<{ y: number } | null>(null);
  const live = Boolean(event && now < event.endsAt);
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [live]);
  useEffect(() => {
    if (event) {
      setNow(Date.now());
      setUp(0);
      play("powerdown");
      buzz(BUZZ.crack);
    }
  }, [event?.job, event?.endsAt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!event || !live) return null;
  const mine = event.flipped.includes(view.me.id);
  const left = Math.max(0, Math.ceil((event.endsAt - now) / 1000));
  const flip = () => {
    if (mine) return;
    setUp(1);
    play("granted");
    buzz(BUZZ.tap);
    void act({ type: "flipFuse" });
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Lights out" className="fixed inset-0 z-50 flex flex-col items-center justify-end gap-5 bg-[radial-gradient(ellipse_at_50%_35%,rgba(20,24,41,.55),rgba(3,4,10,.96)_70%)] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-cream">
      <h2 className="font-display text-4xl italic">Lights out</h2>
      <p className="-mt-3 text-sm font-extrabold text-mustard">Team event · the storm</p>
      <div className="flex w-full max-w-sm items-center justify-between">
        <p className="text-lg font-extrabold">{mine ? "Got it! Waiting for the others" : "Flip your fuse"}</p>
        <span className="grid size-12 place-items-center rounded-full border-[3px] border-mustard font-mono text-lg font-bold text-mustard" aria-label={`${left} seconds left`}>
          {left}
        </span>
      </div>
      <div className="w-full max-w-sm rounded-3xl border-[3px] border-ink bg-[#191b26] p-4 shadow-card">
        <div className="mb-3 h-4 rounded bg-[repeating-linear-gradient(-45deg,#f2b33d_0_10px,#141829_10px_20px)]" aria-hidden="true" />
        <ul className="flex justify-around" aria-label="Everyone's fuses">
          {view.players.map((p) => {
              const done = event.flipped.includes(p.id) || (p.id === view.me.id && up > 0);
              const me = p.id === view.me.id;
              return (
                <li key={p.id} className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={!me || done}
                    onClick={me ? flip : undefined}
                    onPointerDown={(e) => me && (drag.current = { y: e.clientY })}
                    onPointerUp={(e) => {
                      if (me && drag.current && drag.current.y - e.clientY > 20) flip();
                      drag.current = null;
                    }}
                    aria-label={me ? (done ? "Your fuse: flipped" : "Flip your fuse") : `${nameOf(view, p.id)}'s fuse${done ? ": flipped" : ""}`}
                    className={cx("relative h-32 w-14 rounded-2xl border-[3px] border-ink", me ? "bg-mustard" : "bg-[#3a3d55]", me && !done && "ring-4 ring-mustard/50 ring-offset-2 ring-offset-[#191b26]")}
                  >
                    <span className="absolute inset-x-[42%] top-3 bottom-3 rounded-full bg-ink/70" aria-hidden="true" />
                    <span className={cx("absolute left-1/2 size-9 -translate-x-1/2 rounded-full border-[3px] border-ink bg-cream transition-[top] duration-200", done ? "top-2" : "top-[calc(100%-2.75rem)]")} aria-hidden="true" />
                  </button>
                  <span className={cx("max-w-16 truncate rounded-full px-2 text-xs font-extrabold", done ? "bg-teal text-ink" : "bg-cream/15")}>{me ? "You" : nameOf(view, p.id)}</span>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
