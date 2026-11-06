"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { VisibleEvidence } from "@/lib/game/engine";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { TileFace } from "../evidence/EvidenceCard";
import { drawRope, Rope, sagFor, slackForSag, type Point } from "./rope";

export type WallPlace = { x: number; y: number };
export type TieOutcome = { key: number; a: string; b: string; kind: "taut" | "slack" };

/** Where a piece sits until someone places it: a loose grid, in the order things were pinned. */
export function defaultPlace(index: number, columns = 3): WallPlace {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return { x: (100 / columns) * (col + 0.5), y: 5 + row * 31 };
}

/** Where a piece's pin can go, in percent of the wall: far enough in that the whole piece stays on the cork. */
export const WALL_X: [number, number] = [4, 96];
export const WALL_Y: [number, number] = [2, 72];

const TILT = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"];
const DRAG_PX = 8;

type Rig = { rope: Rope; a: string; b?: string; to?: Point; kind: "found" | "preview" | "drag" | "drop"; born: number };

/**
 * The team's wall: every pinned piece on cork, red string tying each
 * contradiction found, and (for the Archivist) their own papers in a tray
 * underneath, ready to be tied or pinned. The Archivist can drag string from
 * piece to piece or tap two, and move pieces around; everyone else taps to read.
 */
export function Wall({
  pieces,
  places,
  strings,
  tray = [],
  selected = [],
  onTap,
  editable = false,
  arranging = false,
  onMove,
  onDragTie,
  outcome,
}: {
  pieces: VisibleEvidence[];
  places: Record<string, WallPlace>;
  strings: { id: string; a: string; b: string }[];
  tray?: VisibleEvidence[];
  selected?: string[];
  onTap: (id: string) => void;
  editable?: boolean;
  arranging?: boolean;
  onMove?: (id: string, place: WallPlace) => void;
  onDragTie?: (from: string, to: string) => void;
  outcome?: TieOutcome | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cork = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const rigs = useRef(new Map<string, Rig>());
  const frame = useRef(0);
  const lastTick = useRef(0);
  const awake = useRef(0);
  const reduced = useRef(false);
  const [moving, setMoving] = useState<{ id: string; place: WallPlace } | null>(null);
  const gesture = useRef<{ id: string; x: number; y: number; moved: boolean; pointer: number } | null>(null);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /** Where a piece's pin is, inside the wall's box. */
  const anchor = useCallback((id: string): Point | null => {
    const el = elements.current.get(id);
    const outer = box.current;
    if (!el || !outer) return null;
    const r = el.getBoundingClientRect();
    const o = outer.getBoundingClientRect();
    return { x: r.left - o.left + r.width / 2, y: r.top - o.top + 9 };
  }, []);

  const tick = useCallback(
    (now: number) => {
      const c = canvas.current;
      const outer = box.current;
      if (!c || !outer) return;
      const dpr = window.devicePixelRatio || 1;
      const w = outer.clientWidth;
      const h = outer.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - (lastTick.current || now)) / 1000 || 1 / 60));
      lastTick.current = now;
      let restless = false;
      for (const [key, rig] of rigs.current) {
        const a = anchor(rig.a);
        const b = rig.to ?? (rig.b ? anchor(rig.b) : null);
        if (!a || !b) continue;
        let alpha = 1;
        if (rig.kind === "drop") {
          const age = now - rig.born;
          alpha = Math.max(0, 1 - age / 1100);
          if (alpha <= 0) {
            rigs.current.delete(key);
            continue;
          }
          restless = true;
        }
        if (reduced.current && rig.kind !== "drop") rig.rope.straighten(a, b);
        else if (rig.rope.step(a, b, dt) > 0.04) restless = true;
        drawRope(ctx, rig.rope, alpha, rig.kind === "found");
      }
      if (restless || gesture.current || now < awake.current) frame.current = requestAnimationFrame(tick);
      else frame.current = 0;
    },
    [anchor],
  );

  /** Runs the strings for a while: after anything changes, they swing and settle. */
  const wake = useCallback(
    (ms = 900) => {
      awake.current = Math.max(awake.current, performance.now() + ms);
      if (!frame.current) {
        // Draw once straight away, so string is there the moment the wall shows, then keep moving it frame by frame.
        lastTick.current = 0;
        tick(performance.now());
      }
    },
    [tick],
  );

  // Forget the frame as well as cancelling it, or a remount would think the strings are already running and never draw them.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  // Keep a string for every contradiction whose two pieces are in view, and one sagging between two picked pieces.
  const here = new Set([...pieces, ...tray].map((e) => e.id));
  const pair = selected.length === 2 ? selected : null;
  const pairTied = pair && strings.some((s) => (s.a === pair[0] && s.b === pair[1]) || (s.a === pair[1] && s.b === pair[0]));
  const stringKey = strings.map((s) => s.id).join(",") + `|${[...here].join(",")}|${pair?.join("+") ?? ""}`;
  useEffect(() => {
    const live = new Set<string>();
    for (const s of strings) {
      if (!here.has(s.a) || !here.has(s.b)) continue;
      const key = `s:${s.id}`;
      live.add(key);
      if (!rigs.current.has(key)) {
        const a = anchor(s.a);
        const b = anchor(s.b);
        if (a && b) rigs.current.set(key, { rope: new Rope(a, b, slackForSag(a, b, sagFor(a, b, "loose"))), a: s.a, b: s.b, kind: "found", born: performance.now() });
      }
    }
    if (pair && !pairTied) {
      live.add("preview");
      const current = rigs.current.get("preview");
      if (!current || current.a !== pair[0] || current.b !== pair[1]) {
        const a = anchor(pair[0]);
        const b = anchor(pair[1]);
        if (a && b) rigs.current.set("preview", { rope: new Rope(a, b, slackForSag(a, b, sagFor(a, b, "loose"))), a: pair[0], b: pair[1], kind: "preview", born: performance.now() });
      }
    }
    for (const [key, rig] of rigs.current) {
      if (rig.kind === "drop" || rig.kind === "drag") continue;
      if (!live.has(key)) rigs.current.delete(key);
    }
    // Found strings pull tight over a moment, from loose to nearly straight.
    for (const rig of rigs.current.values()) {
      if (rig.kind !== "found" || !rig.b) continue;
      const a = anchor(rig.a);
      const b = anchor(rig.b);
      if (a && b) rig.rope.slack = slackForSag(a, b, sagFor(a, b, "tight"));
    }
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringKey, anchor, wake]);

  // A tie that missed: the picked string comes loose and falls away.
  const lastOutcome = useRef<number | null>(null);
  useEffect(() => {
    if (!outcome || outcome.key === lastOutcome.current) return;
    lastOutcome.current = outcome.key;
    if (outcome.kind === "slack") {
      const preview = rigs.current.get("preview");
      const a = anchor(outcome.a);
      const b = anchor(outcome.b);
      const rope = preview?.rope ?? (a && b ? new Rope(a, b, slackForSag(a, b, sagFor(a, b, "loose"))) : null);
      if (rope) {
        rope.release();
        rigs.current.delete("preview");
        rigs.current.set(`drop:${outcome.key}`, { rope, a: outcome.a, kind: "drop", born: performance.now() });
      }
    }
    wake(1400);
  }, [outcome, anchor, wake]);

  // Pieces moving shift the strings, so wake them when places change.
  const placeKey = JSON.stringify(places) + pieces.map((p) => p.id).join(",");
  useEffect(() => {
    wake(700);
  }, [placeKey, wake]);
  useEffect(() => {
    const onResize = () => wake(400);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [wake]);

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) elements.current.set(id, el);
    else elements.current.delete(id);
  };

  const down = (id: string, onWall: boolean) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!editable) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer tracks (a cancelled touch): the gesture still works without capture.
    }
    gesture.current = { id, x: e.clientX, y: e.clientY, moved: false, pointer: e.pointerId };
    if (!arranging || !onWall) wake(200);
  };

  const move = (id: string, onWall: boolean) => (e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.id !== id || g.pointer !== e.pointerId) return;
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < DRAG_PX) return;
    g.moved = true;
    const o = box.current!.getBoundingClientRect();
    if (arranging && onWall) {
      const c = cork.current!.getBoundingClientRect();
      setMoving({ id, place: { x: Math.min(WALL_X[1], Math.max(WALL_X[0], ((e.clientX - c.left) / c.width) * 100)), y: Math.min(WALL_Y[1], Math.max(WALL_Y[0], ((e.clientY - c.top) / c.height) * 100 - 4)) } });
    } else {
      const to = { x: e.clientX - o.left, y: e.clientY - o.top };
      const rig = rigs.current.get("drag");
      if (rig && rig.a === id) rig.to = to;
      else {
        const a = anchor(id);
        if (a) rigs.current.set("drag", { rope: new Rope(a, to, slackForSag(a, to, sagFor(a, to, "drag"))), a: id, to, kind: "drag", born: performance.now() });
      }
      wake(300);
    }
  };

  const up = (id: string, onWall: boolean) => (e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!editable) return onTap(id);
    if (!g || !g.moved) {
      rigs.current.delete("drag");
      return onTap(id);
    }
    if (arranging && onWall && moving) {
      onMove?.(id, moving.place);
      setMoving(null);
      return;
    }
    rigs.current.delete("drag");
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-piece]");
    const to = target?.dataset.piece;
    if (to && to !== id) onDragTie?.(id, to);
    wake(400);
  };

  const tile = (e: VisibleEvidence, i: number, onWall: boolean) => {
    const picked = selected.includes(e.id);
    return (
      <div
        ref={register(e.id)}
        data-piece={e.id}
        role="button"
        tabIndex={0}
        aria-pressed={editable ? picked : undefined}
        aria-label={editable ? `${e.title}${picked ? ", picked" : ""}` : `Read ${e.title}`}
        onKeyDown={(k) => {
          if (k.key === "Enter" || k.key === " ") {
            k.preventDefault();
            onTap(e.id);
          }
        }}
        onPointerDown={down(e.id, onWall)}
        onPointerMove={move(e.id, onWall)}
        onPointerUp={up(e.id, onWall)}
        onPointerCancel={() => {
          gesture.current = null;
          rigs.current.delete("drag");
          setMoving(null);
        }}
        className={cx(
          "relative block w-full cursor-pointer pt-2 text-left outline-none select-none focus-visible:ring-4 focus-visible:ring-mustard",
          editable && "touch-none",
          TILT[i % TILT.length],
          picked && "z-10 scale-[1.06] rotate-0",
          arranging && onWall && "cursor-grab active:cursor-grabbing",
        )}
      >
        <Image src={propArt.pushpin} alt="" sizes="28px" className="absolute top-[-0.35rem] left-1/2 z-10 w-7 -translate-x-1/2" draggable={false} />
        <span className={cx("block drop-shadow-[0_4px_0_rgb(27_31_59/0.45)] transition-[outline]", picked && "rounded-sm outline-4 outline-offset-2 outline-mustard")}>
          <TileFace evidence={e} />
        </span>
      </div>
    );
  };

  return (
    <div ref={box} className="relative">
      <div ref={cork} data-coach="wall" className="corkboard relative aspect-[4/5] overflow-hidden rounded-2xl border-[3px] border-ink shadow-pop sm:aspect-[4/3]">
        {pieces.map((e, i) => {
          const saved = places[e.id];
          const place =
            moving?.id === e.id
              ? moving.place
              : saved
                ? { x: Math.min(WALL_X[1], Math.max(WALL_X[0], saved.x)), y: Math.min(WALL_Y[1], Math.max(WALL_Y[0], saved.y)) }
                : defaultPlace(i);
          return (
            <div key={e.id} className="absolute w-[30%] -translate-x-1/2 sm:w-[21%]" style={{ left: `${place.x}%`, top: `${place.y}%`, zIndex: moving?.id === e.id ? 30 : undefined }}>
              {tile(e, i, true)}
            </div>
          );
        })}
        {!pieces.length && <p className="absolute inset-0 grid place-items-center p-6 text-center font-bold text-ink/45">Nothing pinned yet. Pin what matters, and it goes up here.</p>}
      </div>
      {editable && tray.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-extrabold tracking-widest uppercase opacity-70">Your papers, not on the wall</p>
          <div data-coach="tray" className="flex snap-x gap-3 overflow-x-auto pt-1 pb-2">
            {tray.map((e, i) => (
              <div key={e.id} className="w-[30%] shrink-0 snap-start sm:w-[18%]">
                {tile(e, i + 1, false)}
              </div>
            ))}
          </div>
        </div>
      )}
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute top-0 left-0 z-20" />
    </div>
  );
}
