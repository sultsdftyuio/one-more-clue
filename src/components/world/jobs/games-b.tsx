"use client";

import { useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { buzz, BUZZ } from "@/components/game/haptics";
import { SuspectPortrait } from "@/components/game/parts";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { reducedMotion, useLoop, type GameProps, type Stars } from "./frame";

// ---------------------------------------------------------------------------
// Tea for Squires: drag the tea bag, the hot water and the milk into his mug, in that order. Tapping one adds it too.

const INGREDIENTS = [
  { id: "bag", label: "Tea bag", glyph: "🍵", color: "bg-[#c9a36a]" },
  { id: "water", label: "Hot water", glyph: "💧", color: "bg-[#bfe3ff]" },
  { id: "milk", label: "Milk", glyph: "🥛", color: "bg-cream" },
] as const;

export function Tea({ onDone }: GameProps) {
  const [added, setAdded] = useState<string[]>([]);
  const [slips, setSlips] = useState(0);
  const [shake, setShake] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const mug = useRef<HTMLDivElement>(null);

  const add = (id: string) => {
    if (added.includes(id) || added.length >= 3) return;
    const want = INGREDIENTS[added.length].id;
    if (id !== want) {
      setSlips((n) => n + 1);
      setShake(id);
      play("miss");
      buzz(BUZZ.miss);
      window.setTimeout(() => setShake(null), 450);
      return;
    }
    const next = [...added, id];
    setAdded(next);
    play(next.length === 3 ? "found" : "tap");
    if (next.length === 3) window.setTimeout(() => onDone(slips === 0 ? 3 : slips === 1 ? 2 : 1), 1200);
  };

  const overMug = (x: number, y: number) => {
    const r = mug.current?.getBoundingClientRect();
    return Boolean(r && x > r.left - 30 && x < r.right + 30 && y > r.top - 40 && y < r.bottom + 20);
  };

  return (
    <div
      className="absolute inset-0"
      onPointerMove={(e) => drag && setDrag({ ...drag, x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (drag && overMug(e.clientX, e.clientY)) add(drag.id);
        setDrag(null);
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(#efe2c8_0_58%,transparent_58%),repeating-linear-gradient(90deg,#e6d6b6_0_1px,transparent_1px_34px),repeating-linear-gradient(#e6d6b6_0_1px,transparent_1px_34px)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[58%] bottom-0 bg-[#5a3a26]" />
      <div aria-hidden="true" className="absolute top-[6%] right-[8%] h-28 w-36 rounded-md border-[5px] border-cream bg-[linear-gradient(#1b2347,#2d3a6b)]">
        <span className="absolute top-3 right-4 size-6 rounded-full bg-cream" />
      </div>
      {/* The order, as pictures */}
      <ol className="absolute top-[22%] left-1/2 flex -translate-x-1/2 gap-4" aria-label="Tea, then water, then milk">
        {INGREDIENTS.map((it, i) => (
          <li key={it.id} className={cx("relative grid size-14 place-items-center rounded-full border-[3px] border-ink text-2xl", added.includes(it.id) ? "bg-teal" : "bg-cream")}>
            <span className="absolute -top-2 -left-2 grid size-6 place-items-center rounded-full bg-ink text-xs font-black text-cream">{i + 1}</span>
            <span aria-hidden="true">{it.glyph}</span>
          </li>
        ))}
      </ol>
      {/* His mug */}
      <div ref={mug} className="absolute top-[40%] left-1/2 h-32 w-28 -translate-x-1/2 rounded-b-[2rem] border-[4px] border-ink bg-cream shadow-card">
        <span className="absolute -right-7 top-5 h-14 w-9 rounded-r-full border-[4px] border-l-0 border-ink" aria-hidden="true" />
        <span className="absolute inset-x-0 bottom-0 rounded-b-[1.7rem] transition-[height,background] duration-700" style={{ height: `${added.length * 26}%`, background: added.includes("milk") ? "#c48a55" : added.includes("water") ? "#7a4a22" : "#a87c4a" }} aria-hidden="true" />
        <span className="absolute inset-x-0 top-6 text-center font-display text-2xl text-coral">No.1</span>
        <span className="absolute inset-x-0 top-12 text-center text-[10px] font-black tracking-widest text-ink/60">PROF</span>
        {added.length === 3 && <span className="world-bubble absolute -top-9 left-1/2 -translate-x-1/2 text-3xl" aria-hidden="true">♨</span>}
      </div>
      {/* The things to put in */}
      <ul className="absolute inset-x-0 bottom-[max(3.5rem,env(safe-area-inset-bottom))] flex justify-center gap-4">
        {INGREDIENTS.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              aria-label={`Put in the ${it.label.toLowerCase()}`}
              disabled={added.includes(it.id)}
              onPointerDown={(e) => setDrag({ id: it.id, x: e.clientX, y: e.clientY })}
              onClick={() => !drag && add(it.id)}
              className={cx("grid size-20 place-items-center rounded-2xl border-[3px] border-ink text-4xl shadow-pop-sm disabled:opacity-30", it.color, shake === it.id && "animate-shake")}
            >
              <span aria-hidden="true">{it.glyph}</span>
            </button>
          </li>
        ))}
      </ul>
      {drag && (
        <span aria-hidden="true" className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 text-5xl drop-shadow-lg" style={{ left: drag.x, top: drag.y }}>
          {INGREDIENTS.find((i) => i.id === drag.id)?.glyph}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breathe with Priya: hold to breathe in while the circle grows, let go when it fills the ring. Three breaths.

const GROW_MS = 2600;

export function Breathe({ onDone, friend }: GameProps & { friend?: CaseSuspect }) {
  const [breath, setBreath] = useState(0);
  const [good, setGood] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const [size, setSize] = useState(0.3);
  const [said, setSaid] = useState<string | null>(null);
  useLoop(held !== null, () => setSize(Math.min(1.08, 0.3 + ((performance.now() - (held ?? 0)) / GROW_MS) * 0.78)));

  const press = () => {
    if (breath >= 3 || held !== null) return;
    setHeld(performance.now());
    setSaid(null);
  };
  const release = () => {
    if (held === null) return;
    setHeld(null);
    const ok = size > 0.86;
    setSaid(ok ? "And out…" : "A bit longer next time");
    play(ok ? "found" : "tap");
    buzz(BUZZ.tap);
    const total = good + (ok ? 1 : 0);
    setGood(total);
    const n = breath + 1;
    setBreath(n);
    window.setTimeout(() => setSize(0.3), reducedMotion() ? 0 : 500);
    if (n >= 3) window.setTimeout(() => onDone(Math.max(1, total) as Stars), 1200);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-8 pb-6">
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(#36435f,#25304a)]" />
      {friend && (
        <div className="absolute top-[6%] left-1/2 w-28 -translate-x-1/2">
          <SuspectPortrait suspect={friend} mood={breath >= 3 ? "idle" : "nervous"} className="w-full" />
        </div>
      )}
      <div className="relative grid size-64 place-items-center">
        <span className="absolute inset-0 rounded-full border-[6px] border-cream/30" aria-hidden="true" />
        <span className="absolute inset-3 rounded-full border-[3px] border-dashed border-teal/50" aria-hidden="true" />
        <span className="grid place-items-center rounded-full border-[3px] border-ink bg-teal font-display text-xl text-ink transition-[width,height] duration-75" style={{ width: `${size * 100}%`, height: `${size * 100}%` }}>
          {held !== null ? "Breathe in" : said ?? "Ready"}
        </span>
      </div>
      <p className="relative flex gap-2" aria-label={`Breath ${Math.min(3, breath + 1)} of 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx("size-3.5 rounded-full border-2 border-cream", i < breath ? "bg-teal" : "")} />
        ))}
      </p>
      <button
        type="button"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && press()}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && release()}
        disabled={breath >= 3}
        className="relative rounded-full border-[3px] border-ink bg-teal px-12 py-4 font-display text-2xl text-ink shadow-pop-sm active:translate-y-1 active:shadow-none"
      >
        Hold
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race Rena: trace the wire across the breadboard with your thumb before her dot gets to the end.

const WIRE: [number, number][] = [
  [30, 230],
  [30, 110],
  [150, 110],
  [150, 40],
  [250, 40],
  [250, 200],
  [190, 200],
];
const RENA_MS = 13_000;
const NEAR = 34;

function wireLength() {
  let total = 0;
  for (let i = 1; i < WIRE.length; i++) total += Math.hypot(WIRE[i][0] - WIRE[i - 1][0], WIRE[i][1] - WIRE[i - 1][1]);
  return total;
}
const TOTAL = wireLength();

/** How far along the wire (0–1) a point is, and how far off it. */
function along(x: number, y: number) {
  let best = { t: 0, d: Infinity };
  let run = 0;
  for (let i = 1; i < WIRE.length; i++) {
    const [ax, ay] = WIRE[i - 1];
    const [bx, by] = WIRE[i];
    const len = Math.hypot(bx - ax, by - ay);
    const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len)));
    const d = Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay)));
    if (d < best.d) best = { t: (run + u * len) / TOTAL, d };
    run += len;
  }
  return best;
}

function pointAt(t: number): [number, number] {
  let left = t * TOTAL;
  for (let i = 1; i < WIRE.length; i++) {
    const [ax, ay] = WIRE[i - 1];
    const [bx, by] = WIRE[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (left <= len) return [ax + ((bx - ax) * left) / len, ay + ((by - ay) * left) / len];
    left -= len;
  }
  return WIRE[WIRE.length - 1];
}

export function Race({ onDone }: GameProps) {
  const [mine, setMine] = useState(0);
  const [hers, setHers] = useState(0);
  const [over, setOver] = useState(false);
  const board = useRef<SVGSVGElement>(null);
  const tracing = useRef(false);
  const started = useRef(0);
  useLoop(!over, (ms) => {
    if (!started.current) started.current = performance.now() - ms;
    setHers(Math.min(1, ms / RENA_MS));
    // Rena's done and you're well behind: it ends anyway, with a star for trying.
    if (ms > RENA_MS + 6000) end(1);
  });

  const end = (stars: Stars) => {
    if (over) return;
    setOver(true);
    play(stars === 3 ? "found" : "tap");
    window.setTimeout(() => onDone(stars), 900);
  };

  const move = (e: React.PointerEvent) => {
    if (!tracing.current || !board.current || over) return;
    const r = board.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 280;
    const y = ((e.clientY - r.top) / r.height) * 270;
    const at = along(x, y);
    // Stay near the wire and keep going forward; wandering off just stops you, it never sends you back.
    if (at.d > NEAR || at.t < mine - 0.02 || at.t > mine + 0.15) return;
    setMine(at.t);
    if (at.t > 0.985) {
      const took = performance.now() - started.current;
      end(took <= RENA_MS ? 3 : took <= RENA_MS + 3000 ? 2 : 1);
    }
  };

  const [mx, my] = pointAt(mine);
  const [hx, hy] = pointAt(hers);
  const path = WIRE.map((p) => p.join(",")).join(" ");
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(#5c6680,#46506a)]" />
      <div className="relative w-[min(22rem,88vw)] rounded-2xl border-[3px] border-ink bg-[#1d2235] p-3">
        {[
          { t: mine, label: "You", color: "bg-mustard" },
          { t: hers, label: "Rena", color: "bg-coral" },
        ].map((lane) => (
          <div key={lane.label} className="relative my-1.5 h-2 rounded-full bg-cream/15">
            <span className={cx("absolute -top-2 grid size-6 -translate-x-1/2 place-items-center rounded-full border-2 border-ink text-[8px] font-black text-ink", lane.color)} style={{ left: `${lane.t * 100}%` }}>
              {lane.label}
            </span>
          </div>
        ))}
      </div>
      <svg
        ref={board}
        viewBox="0 0 280 270"
        className="relative w-[min(22rem,88vw)] touch-none rounded-2xl border-[4px] border-[#2a8a50] bg-[radial-gradient(#d9dccf_1.2px,transparent_1.4px)_0_0/12px_12px,#f2f2ea]"
        onPointerDown={(e) => {
          tracing.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={() => (tracing.current = false)}
        role="img"
        aria-label="The breadboard wire, from the battery to the light"
      >
        <rect x="8" y="215" width="44" height="40" rx="6" fill="#c23b3b" stroke="#141829" strokeWidth="3" />
        <text x="30" y="242" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff4e0">+</text>
        <circle cx="190" cy="200" r="16" fill={mine > 0.985 ? "#f2b33d" : "#e3e5ef"} stroke="#141829" strokeWidth="3" />
        <polyline points={path} fill="none" stroke="#9aa3bf" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={path} fill="none" stroke="#2bb0a6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${mine * TOTAL} ${TOTAL}`} />
        <circle cx={hx} cy={hy} r="7" fill="#ef6b5c" stroke="#141829" strokeWidth="2" />
        <circle cx={mx} cy={my} r="13" fill="#f2b33d" stroke="#141829" strokeWidth="3" />
      </svg>
      {/* For anyone who can't trace: hold to run your dot along the wire. */}
      <button
        type="button"
        aria-label="Hold to trace the wire"
        onPointerDown={() => {
          const id = window.setInterval(() => setMine((m) => {
            const n = Math.min(1, m + 0.012);
            if (n > 0.985) {
              window.clearInterval(id);
              end(2);
            }
            return n;
          }), 120);
          const stop = () => window.clearInterval(id);
          window.addEventListener("pointerup", stop, { once: true });
        }}
        className="sr-only focus:not-sr-only focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-ink"
      >
        Hold to trace
      </button>
    </div>
  );
}
