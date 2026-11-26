"use client";

import { useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { buzz, BUZZ } from "@/components/game/haptics";
import { SuspectPortrait } from "@/components/game/parts";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { shortName } from "@/lib/world/cast";
import { reducedMotion, useLoop, type GameProps, type Stars } from "./frame";
import { BenchScene, KitchenScene, LabScene, Sparks } from "./scenes";

// ---------------------------------------------------------------------------
// Tea for Squires, in the staff kitchen: drag the tea bag, the kettle and the milk to his mug, in that order (or tap
// them). Each one goes in with its own little moment: the bag drops, the kettle pours and steams, the milk clouds it.
// The wrong one first and he shows you, in a bubble, the one he wants.

const INGREDIENTS = [
  { id: "bag", label: "Tea bag", tilt: "0deg" },
  { id: "water", label: "Kettle", tilt: "-42deg" },
  { id: "milk", label: "Milk", tilt: "-105deg" },
] as const;
type Ingredient = (typeof INGREDIENTS)[number]["id"];

function Thing({ id, className }: { id: Ingredient; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {id === "bag" && (
        <>
          <path d="M32 6V22" stroke="#141829" strokeWidth="2" />
          <rect x="24" y="2" width="16" height="11" rx="2" fill="#F2B33D" stroke="#141829" strokeWidth="2.5" />
          <path d="M13 22h38l-3 36H16Z" fill="#E7D3A8" stroke="#141829" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M13 22l19 7 19-7" fill="none" stroke="#141829" strokeWidth="2.5" />
          <path d="M20 36h24M19 44h26M18 52h28" stroke="#A9834C" strokeWidth="2.4" strokeDasharray="2 3" />
        </>
      )}
      {id === "water" && (
        <>
          <path d="M22 20Q32 4 42 20" fill="none" stroke="#141829" strokeWidth="5" strokeLinecap="round" />
          <path d="M14 34 4 25l2.5-3.5L16 28" fill="#3E7FD9" stroke="#141829" strokeWidth="3" strokeLinejoin="round" />
          <path d="M17 26q0-7 8-7h14q7 0 8 7l5 28q0 4-4 4H16q-4 0-4-4Z" fill="#3E7FD9" stroke="#141829" strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="27" y="14" width="10" height="5" rx="2" fill="#141829" />
          <path d="M20 31h24" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
          <circle cx="42" cy="49" r="3" fill="#E8574A" stroke="#141829" strokeWidth="1.5" />
        </>
      )}
      {id === "milk" && (
        <>
          <path d="M25 6h14v8l7 10v32q0 4-4 4H22q-4 0-4-4V24l7-10Z" fill="#FFFFFF" stroke="#141829" strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="23.5" y="2" width="17" height="8" rx="2" fill="#3E7FD9" stroke="#141829" strokeWidth="2.5" />
          <rect x="21" y="32" width="22" height="15" rx="2" fill="#9FD6CF" stroke="#141829" strokeWidth="2" />
          <path d="M26 39.5h12" stroke="#141829" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22 26h6" stroke="#D9E6F2" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** His mug, seen a little from above: you see what's in it, and steam once the water's in. */
function Mug({ added }: { added: string[] }) {
  const water = added.includes("water");
  const milk = added.includes("milk");
  const fill = milk ? "#C4895A" : water ? "#7A4A22" : "#4B3A33";
  return (
    <svg viewBox="0 0 150 140" className="w-full overflow-visible" aria-hidden="true">
      <ellipse cx="66" cy="132" rx="58" ry="7" fill="#141829" opacity="0.25" />
      <path d="M118 44h10a20 20 0 0 1 0 40h-10" fill="none" stroke="#141829" strokeWidth="13" />
      <path d="M118 44h10a20 20 0 0 1 0 40h-10" fill="none" stroke="#FFF8E8" strokeWidth="6" />
      <path d="M14 24V100q0 30 30 30h44q30 0 30-30V24Z" fill="#FFF8E8" stroke="#141829" strokeWidth="5" strokeLinejoin="round" />
      <path d="M24 40v56q0 18 14 24" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="66" cy="24" rx="52" ry="14" fill="#FFF8E8" stroke="#141829" strokeWidth="5" />
      <ellipse cx="66" cy="25" rx="44" ry="10" fill={fill} style={{ transition: "fill 700ms" }} />
      {water && <ellipse cx="52" cy="22" rx="14" ry="2.5" fill="#FFFFFF" opacity="0.35" />}
      {milk && <path d="M46 25q10-6 20 0t20 0" fill="none" stroke="#F4E2C8" strokeWidth="3" strokeLinecap="round" />}
      {added.includes("bag") && (
        <>
          <rect x="70" y="18" width="16" height="12" rx="2" fill="#E7D3A8" stroke="#141829" strokeWidth="2" opacity={water ? 0.75 : 1} />
          <path d="M78 18Q60 2 26 22" fill="none" stroke="#141829" strokeWidth="1.6" />
          <path d="M26 22v18" stroke="#141829" strokeWidth="1.6" />
          <rect x="19" y="38" width="14" height="12" rx="2" fill="#F2B33D" stroke="#141829" strokeWidth="2" />
        </>
      )}
      <text x="66" y="84" textAnchor="middle" fontSize="26" fontWeight="900" fill="#E8574A">No.1</text>
      <text x="66" y="102" textAnchor="middle" fontSize="11" fontWeight="900" letterSpacing="4" fill="#141829" opacity="0.6">PROF</text>
    </svg>
  );
}

export function Tea({ onDone, host }: GameProps & { host?: CaseSuspect }) {
  const [added, setAdded] = useState<Ingredient[]>([]);
  const [slips, setSlips] = useState(0);
  const [shake, setShake] = useState<string | null>(null);
  const [wants, setWants] = useState<Ingredient | null>(null);
  const [pour, setPour] = useState<{ id: Ingredient; n: number } | null>(null);
  const [drag, setDrag] = useState<{ id: Ingredient; x: number; y: number } | null>(null);
  const [spark, setSpark] = useState(0);
  const mug = useRef<HTMLDivElement>(null);
  const done = added.length === 3;

  const add = (id: Ingredient) => {
    if (added.includes(id) || done || pour) return;
    const want = INGREDIENTS[added.length].id;
    if (id !== want) {
      setSlips((n) => n + 1);
      setShake(id);
      setWants(want);
      play("miss");
      buzz(BUZZ.miss);
      window.setTimeout(() => setShake(null), 450);
      window.setTimeout(() => setWants((w) => (w === want ? null : w)), 1600);
      return;
    }
    setWants(null);
    const next = [...added, id];
    const quick = reducedMotion();
    setPour({ id, n: Date.now() });
    play(id === "bag" ? "tap" : "whoosh");
    window.setTimeout(() => {
      setAdded(next);
      if (next.length === 3) {
        play("found");
        setSpark(Date.now());
      }
    }, quick ? 0 : id === "bag" ? 420 : 760);
    window.setTimeout(() => setPour(null), quick ? 0 : 1150);
    if (next.length === 3) window.setTimeout(() => onDone(slips === 0 ? 3 : slips === 1 ? 2 : 1), 2300);
  };

  const overMug = (x: number, y: number) => {
    const r = mug.current?.getBoundingClientRect();
    return Boolean(r && x > r.left - 40 && x < r.right + 40 && y > r.top - 80 && y < r.bottom + 20);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onPointerMove={(e) => drag && setDrag({ ...drag, x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (drag && overMug(e.clientX, e.clientY)) add(drag.id);
        setDrag(null);
      }}
    >
      <KitchenScene />
      {/* His order, pinned to the wall as pictures */}
      <div className="absolute top-[6.25rem] left-1/2 -translate-x-1/2 -rotate-2 rounded-md border-[3px] border-ink bg-[#FFF8E8] px-3 pt-3 pb-2 shadow-pop-sm sm:left-[30%]">
        <span aria-hidden="true" className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full border-2 border-ink bg-coral" />
        <ol className="flex gap-2" aria-label="Tea bag, then the kettle, then milk">
          {INGREDIENTS.map((it, i) => (
            <li
              key={it.id}
              className={cx(
                "relative grid size-12 place-items-center rounded-lg border-2 border-ink/20",
                added.includes(it.id) ? "bg-teal/30" : i === added.length && !done ? "bg-mustard/30 ring-4 ring-mustard" : "bg-transparent",
              )}
            >
              <span className="absolute -top-2 -left-2 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-black text-cream">{i + 1}</span>
              <Thing id={it.id} className="size-9" />
              {added.includes(it.id) && <span className="absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full border-2 border-ink bg-[#5FD38A] text-[10px] font-black">✓</span>}
            </li>
          ))}
        </ol>
      </div>
      {/* Squires, behind the counter */}
      {host && (
        <div className="absolute right-[3%] bottom-[33%] w-[30%] max-w-52 sm:right-[16%]">
          <SuspectPortrait suspect={host} mood={done ? "smug" : wants ? "shocked" : "idle"} className="w-full" />
          {(wants || done) && (
            <span className="world-bubble absolute -top-4 -left-6 grid size-16 place-items-center rounded-full border-[3px] border-ink bg-cream shadow-pop-sm">
              {done ? <span className="text-3xl text-coral">♥</span> : wants && <Thing id={wants} className="size-11" />}
            </span>
          )}
        </div>
      )}
      {/* The counter */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[36%] border-t-[5px] border-ink bg-[repeating-linear-gradient(90deg,#4E9A8E_0_118px,#141829_118px_122px)]">
        <div className="h-5 border-b-[4px] border-ink bg-[#C9A36A]" />
        <div className="absolute inset-x-0 top-12 h-1 bg-[#3B7C72]" />
      </div>
      {/* His mug on the counter, and what's going into it */}
      <div ref={mug} className="absolute bottom-[calc(36%-14px)] left-1/2 w-32 -translate-x-1/2 sm:w-40">
        <Mug added={added} />
        {added.includes("water") && (
          <div aria-hidden="true" className="pointer-events-none absolute -top-10 left-[44%] flex -translate-x-1/2 gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="world-steam block h-9 w-2.5 rounded-full bg-white/70 blur-[1px]" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
          </div>
        )}
        {pour && pour.id === "bag" && <Thing key={pour.n} id="bag" className="world-drop absolute -top-16 left-[44%] size-14 -translate-x-1/2" />}
        {pour && pour.id !== "bag" && (
          <div key={pour.n} aria-hidden="true" className="pointer-events-none">
            <span className={cx("world-stream absolute -top-[42%] left-[44%] h-[58%] w-3 -translate-x-1/2 rounded-full border-2 border-ink/30", pour.id === "milk" ? "bg-white" : "bg-[#BFE3FF]")} />
            <span className="world-tilt absolute -top-[96%] left-[52%] block size-24" style={{ ["--tilt" as string]: INGREDIENTS.find((i) => i.id === pour.id)?.tilt }}>
              <Thing id={pour.id} className="size-full" />
            </span>
          </div>
        )}
        <Sparks fire={spark} x={44} y={10} colour="#F2B33D" />
      </div>
      {done && <p className="world-pop pointer-events-none absolute top-[38%] left-1/2 -translate-x-1/2 font-display text-5xl text-mustard [-webkit-text-stroke:2px_#141829] [paint-order:stroke] drop-shadow-[0_4px_0_#141829]">Lovely!</p>}
      {/* The things to put in, on the counter's shelf */}
      <ul className="absolute inset-x-0 bottom-[max(4rem,env(safe-area-inset-bottom))] flex justify-center gap-4">
        {INGREDIENTS.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              aria-label={`Put in the ${it.label.toLowerCase()}`}
              disabled={added.includes(it.id) || done}
              onPointerDown={(e) => setDrag({ id: it.id, x: e.clientX, y: e.clientY })}
              onClick={() => !drag && add(it.id)}
              className={cx(
                "grid size-20 touch-none place-items-center rounded-2xl border-[3px] border-ink bg-[#FFF8E8] shadow-pop-sm transition-opacity active:translate-y-1 active:shadow-none disabled:opacity-30 sm:size-24",
                shake === it.id && "animate-shake",
                drag?.id === it.id && "opacity-40",
              )}
            >
              <Thing id={it.id} className="size-14 sm:size-16" />
            </button>
          </li>
        ))}
      </ul>
      {drag && (
        <span aria-hidden="true" className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_4px_rgba(0,0,0,0.3)]" style={{ left: drag.x, top: drag.y }}>
          <Thing id={drag.id} className="size-20" />
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breathe with Priya: hold to breathe in while the circle grows, let go when it fills the glowing band. Three breaths.
// Lab 4 behind her; she calms down (and the room warms) with each good breath.

const GROW_MS = 2600;
/** The band to let go in, as a share of the ring. */
const BAND = [0.84, 1.02] as const;

export function Breathe({ onDone, friend }: GameProps & { friend?: CaseSuspect }) {
  const [breath, setBreath] = useState(0);
  const [good, setGood] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const [size, setSize] = useState(0.3);
  const [said, setSaid] = useState<string | null>(null);
  const [spark, setSpark] = useState(0);
  useLoop(held !== null, () => setSize(Math.min(1.1, 0.3 + ((performance.now() - (held ?? 0)) / GROW_MS) * 0.78)));
  const inBand = held !== null && size >= BAND[0] && size <= BAND[1];

  const press = () => {
    if (breath >= 3 || held !== null) return;
    setHeld(performance.now());
    setSaid(null);
    play("whoosh");
  };
  const release = () => {
    if (held === null) return;
    setHeld(null);
    const ok = size >= BAND[0] && size <= BAND[1] + 0.06;
    setSaid(ok ? "And out…" : size < BAND[0] ? "A little longer" : "Too long, softer");
    play(ok ? "found" : "tap");
    buzz(BUZZ.tap);
    if (ok) setSpark(Date.now());
    const total = good + (ok ? 1 : 0);
    setGood(total);
    const n = breath + 1;
    setBreath(n);
    window.setTimeout(() => setSize(0.3), reducedMotion() ? 0 : 700);
    if (n >= 3) window.setTimeout(() => onDone(Math.max(1, total) as Stars), 1300);
  };

  const mood = breath >= 3 || good >= 2 ? "idle" : good >= 1 ? "idle" : "nervous";
  const cue = held !== null ? (inBand ? "Let go now!" : size > BAND[1] ? "Let go!" : "Breathe in…") : (said ?? (breath === 0 ? "Hold to breathe in" : "Again"));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-6 pb-16">
      <LabScene calm={good / 3} />
      {friend && (
        <div className={cx("absolute top-[13%] left-1/2 w-[32%] max-w-44 -translate-x-1/2 transition-transform duration-700 sm:top-auto sm:bottom-[30%] sm:left-[16%] sm:max-w-60 sm:translate-x-0", held !== null && "scale-[1.04]")}>
          <SuspectPortrait suspect={friend} mood={mood} className="w-full drop-shadow-[0_8px_0_rgba(20,24,41,0.35)]" />
          {breath < 3 && good === 0 && (
            <svg viewBox="0 0 20 28" className="world-fresh absolute -top-1 right-1 h-8 w-6" aria-hidden="true">
              <path d="M10 2c5 8 8 12 8 16a8 8 0 0 1-16 0c0-4 3-8 8-16z" fill="#7FC4F0" stroke="#141829" strokeWidth="2.5" />
            </svg>
          )}
        </div>
      )}
      <div className="relative mb-2 grid size-[min(17rem,62vw)] place-items-center sm:size-[min(22rem,48vh)]">
        {/* the band to let go in */}
        <span aria-hidden="true" className={cx("absolute inset-0 rounded-full border-[10px] transition-colors", inBand ? "border-mustard shadow-[0_0_40px_10px_rgba(242,179,61,0.55)]" : "border-teal/45")} />
        <span aria-hidden="true" className="absolute inset-[9%] rounded-full border-2 border-dashed border-cream/35" />
        <span
          className={cx(
            "relative grid place-items-center rounded-full border-[3px] border-ink text-center font-display text-lg leading-tight text-ink transition-[width,height,background] duration-75",
            inBand ? "bg-mustard" : "bg-[radial-gradient(circle_at_35%_30%,#b9f2ea,#3FB8AF_65%)]",
          )}
          style={{ width: `${size * 100}%`, height: `${size * 100}%`, boxShadow: held !== null ? "0 0 30px 6px rgba(63,184,175,0.55)" : undefined }}
        >
          <span className="sr-only">{cue}</span>
        </span>
        <p aria-hidden="true" className={cx("absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-ink px-4 py-1 font-display text-xl whitespace-nowrap text-ink shadow-pop-sm transition-colors", inBand ? "bg-mustard" : "bg-cream")}>
          {cue}
        </p>
        <Sparks fire={spark} x={50} y={50} colour="#B9F2EA" />
      </div>
      <p className="relative flex gap-3" aria-label={`Breath ${Math.min(3, breath + 1)} of 3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cx(
              "grid size-6 place-items-center rounded-full border-[3px] border-ink text-xs font-black transition-colors",
              i < good ? "bg-teal" : i < breath ? "bg-cream/40" : "bg-night/60",
            )}
          >
            {i < good ? "✓" : ""}
          </span>
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
        className={cx(
          "relative rounded-full border-[3px] border-ink px-14 py-4 font-display text-2xl text-ink shadow-pop transition-transform active:translate-y-1 active:shadow-none",
          held !== null ? "scale-95 bg-mustard" : "bg-teal",
        )}
      >
        {held !== null ? "Holding…" : "Hold"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race Rena at the workbench: trace the wire across the breadboard with your thumb before her spark gets to the end.
// Her trail shows how far she's got; the bulb at the end lights for whoever gets there first.

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

export function Race({ onDone, rival }: GameProps & { rival?: CaseSuspect }) {
  const [mine, setMine] = useState(0);
  const [hers, setHers] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [spark, setSpark] = useState(0);
  const board = useRef<SVGSVGElement>(null);
  const tracing = useRef(false);
  const started = useRef(0);
  useLoop(won === null, (ms) => {
    if (!started.current) started.current = performance.now() - ms;
    setHers(Math.min(1, ms / RENA_MS));
    // Rena's done and you're well behind: it ends anyway, with a star for trying.
    if (ms > RENA_MS + 6000) end(1, false);
  });

  const end = (stars: Stars, first: boolean) => {
    if (won !== null) return;
    setWon(first);
    if (first) setSpark(Date.now());
    play(stars === 3 ? "found" : "tap");
    window.setTimeout(() => onDone(stars), 1400);
  };

  const move = (e: React.PointerEvent) => {
    if (!tracing.current || !board.current || won !== null) return;
    const r = board.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 280;
    const y = ((e.clientY - r.top) / r.height) * 270;
    const at = along(x, y);
    // Stay near the wire and keep going forward; wandering off just stops you, it never sends you back.
    if (at.d > NEAR || at.t < mine - 0.02 || at.t > mine + 0.15) return;
    setMine(at.t);
    if (at.t > 0.985) {
      const took = performance.now() - started.current;
      end(took <= RENA_MS ? 3 : took <= RENA_MS + 3000 ? 2 : 1, took <= RENA_MS);
    }
  };

  const [mx, my] = pointAt(mine);
  const [hx, hy] = pointAt(hers);
  const path = WIRE.map((p) => p.join(",")).join(" ");
  const lit = won !== null && mine > 0.985;
  const name = rival ? shortName(rival.name) : "Rena";
  const mood = won === true ? "shocked" : won === false ? "smug" : hers - mine > 0.12 ? "smug" : mine - hers > 0.12 ? "nervous" : "idle";
  const size = "w-[min(24rem,90vw)] sm:w-[min(32rem,58vh)]";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pt-24 pb-14">
      <BenchScene />
      {/* The race: two lanes to the finish flag, with Rena watching hers */}
      <div className={cx("relative flex items-end gap-2", size)}>
        <div className="flex-1 rounded-2xl border-[3px] border-ink bg-[#1d2235] px-3 py-2 shadow-pop-sm">
          {[
            { t: mine, label: "YOU", dot: "bg-mustard" },
            { t: hers, label: name.slice(0, 1).toUpperCase(), dot: "bg-coral" },
          ].map((lane) => (
            <div key={lane.label} className="relative my-2 mr-6 h-3 rounded-full bg-[repeating-linear-gradient(90deg,rgba(244,238,228,.25)_0_8px,transparent_8px_14px)]">
              <span className={cx("absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink text-[9px] font-black text-ink", lane.dot)} style={{ left: `${lane.t * 100}%` }}>
                {lane.label}
              </span>
            </div>
          ))}
          <span aria-hidden="true" className="absolute top-2 right-3 bottom-2 w-4 rounded-sm border-2 border-ink bg-[repeating-conic-gradient(#141829_0_25%,#F4EEE4_0_50%)] bg-[length:8px_8px]" />
        </div>
        {rival && <SuspectPortrait suspect={rival} mood={mood} className="w-16 shrink-0 drop-shadow-[0_5px_0_rgba(20,24,41,0.35)] sm:w-24" />}
      </div>
      <div className={cx("relative", size)}>
        <svg
          ref={board}
          viewBox="0 0 280 270"
          className="w-full touch-none rounded-2xl border-[4px] border-ink shadow-[0_10px_0_rgba(20,24,41,0.35)]"
          onPointerDown={(e) => {
            tracing.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            move(e);
          }}
          onPointerMove={move}
          onPointerUp={() => (tracing.current = false)}
          role="img"
          aria-label="The breadboard wire, from the battery to the bulb"
        >
          <defs>
            <pattern id="race-holes" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#F2EFE6" />
              <rect x="3.5" y="3.5" width="3" height="3" rx="0.6" fill="#C9C2B0" />
            </pattern>
            <radialGradient id="race-glow">
              <stop offset="0" stopColor="#FFE27A" stopOpacity="0.95" />
              <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="280" height="270" fill="url(#race-holes)" />
          <path d="M6 8h268M6 262h268" stroke="#E8574A" strokeWidth="2.5" />
          <path d="M6 14h268M6 256h268" stroke="#3E7FD9" strokeWidth="2.5" />
          <rect x="4" y="126" width="272" height="6" fill="#E2DCCC" />
          {/* parts on the board */}
          <rect x="66" y="142" width="58" height="26" rx="3" fill="#23262F" stroke="#141829" strokeWidth="2" />
          <circle cx="73" cy="155" r="3" fill="#3A3E4A" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <rect x={74 + i * 8.5} y="137" width="3" height="5" fill="#9AA3B5" />
              <rect x={74 + i * 8.5} y="168" width="3" height="5" fill="#9AA3B5" />
            </g>
          ))}
          <path d="M62 204h70" stroke="#9AA3B5" strokeWidth="2" />
          <rect x="80" y="198" width="34" height="12" rx="5" fill="#E8C995" stroke="#141829" strokeWidth="1.8" />
          {["#8B4513", "#141829", "#E8574A"].map((c, i) => (
            <rect key={c} x={87 + i * 7} y="198" width="3" height="12" fill={c} />
          ))}
          <path d="M196 64v50" stroke="#9AA3B5" strokeWidth="2" />
          <rect x="186" y="68" width="20" height="30" rx="4" fill="#3E7FD9" stroke="#141829" strokeWidth="2" />
          <rect x="200" y="70" width="4" height="26" fill="#9FC3F0" />
          <path d="M214 120v52" stroke="#9AA3B5" strokeWidth="2" />
          <rect x="208" y="130" width="12" height="32" rx="5" fill="#E8C995" stroke="#141829" strokeWidth="1.8" />
          <rect x="208" y="138" width="12" height="3" fill="#3FB8AF" />
          <rect x="208" y="146" width="12" height="3" fill="#8E74E8" />
          <circle cx="66" cy="60" r="9" fill="#5FD38A" stroke="#141829" strokeWidth="2" opacity={lit ? 1 : 0.55} />
          <path d="M62 69v14M70 69v14" stroke="#9AA3B5" strokeWidth="2" />
          {/* the battery */}
          <rect x="6" y="212" width="48" height="44" rx="6" fill="#C23B3B" stroke="#141829" strokeWidth="3" />
          <rect x="22" y="206" width="16" height="7" rx="2" fill="#9AA3B5" stroke="#141829" strokeWidth="2" />
          <text x="30" y="240" textAnchor="middle" fontSize="18" fontWeight="900" fill="#FFF4E0">+</text>
          <text x="30" y="252" textAnchor="middle" fontSize="7" fontWeight="900" fill="#FFF4E0">9V</text>
          {/* the wire to trace: a groove, Rena's trail, then yours */}
          <polyline points={path} fill="none" stroke="#B9B2A0" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={path} fill="none" stroke="#E4DECF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={path} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
          <polyline points={path} fill="none" stroke="#EF6B5C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${hers * TOTAL} ${TOTAL}`} opacity="0.75" />
          <polyline
            points={path}
            fill="none"
            stroke="#2BB0A6"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${mine * TOTAL} ${TOTAL}`}
            style={{ filter: "drop-shadow(0 0 4px #7FF3EA)" }}
          />
          {/* the bulb at the end */}
          {lit && <circle cx="190" cy="200" r="46" fill="url(#race-glow)" className="world-bulb" />}
          <rect x="182" y="212" width="16" height="12" rx="2" fill="#9AA3B5" stroke="#141829" strokeWidth="2" />
          <circle cx="190" cy="200" r="16" fill={lit ? "#FFE27A" : "#E3E5EF"} stroke="#141829" strokeWidth="3" />
          <path d="M184 204q3-8 6 0t6 0" fill="none" stroke={lit ? "#E8574A" : "#9AA3B5"} strokeWidth="2" />
          {mine === 0 && <circle cx={WIRE[0][0]} cy={WIRE[0][1]} r="13" fill="none" stroke="#F2B33D" strokeWidth="4" className="world-ring-pulse" />}
          <circle cx={hx} cy={hy} r="8" fill="#EF6B5C" stroke="#141829" strokeWidth="2" />
          <circle cx={hx - 2} cy={hy - 2} r="2.4" fill="#FFFFFF" opacity="0.8" />
          <circle cx={mx} cy={my} r="13" fill="#F2B33D" stroke="#141829" strokeWidth="3" />
          <circle cx={mx - 4} cy={my - 4} r="3.5" fill="#FFFFFF" opacity="0.85" />
        </svg>
        <Sparks fire={spark} x={68} y={74} colour="#FFE27A" />
        {won !== null && (
          <p
            className={cx(
              "world-pop pointer-events-none absolute top-[36%] left-1/2 -translate-x-1/2 font-display text-5xl whitespace-nowrap [-webkit-text-stroke:2px_#141829] [paint-order:stroke] drop-shadow-[0_4px_0_#141829]",
              won ? "text-mustard" : "text-coral",
            )}
          >
            {won ? "You win!" : `${name} wins`}
          </p>
        )}
      </div>
      {/* For anyone who can't trace: hold to run your dot along the wire. */}
      <button
        type="button"
        aria-label="Hold to trace the wire"
        onPointerDown={() => {
          const id = window.setInterval(
            () =>
              setMine((m) => {
                const n = Math.min(1, m + 0.012);
                if (n > 0.985) {
                  window.clearInterval(id);
                  end(2, false);
                }
                return n;
              }),
            120,
          );
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
