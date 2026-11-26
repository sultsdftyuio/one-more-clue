"use client";

import { useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { buzz, BUZZ } from "@/components/game/haptics";
import { SuspectPortrait } from "@/components/game/parts";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { reducedMotion, useLoop, type GameProps, type Stars } from "./frame";

const big = "rounded-full border-[3px] border-ink bg-mustard font-display text-ink shadow-pop-sm active:translate-y-1 active:shadow-none";

// ---------------------------------------------------------------------------
// Coffee run: the lobby's drinks machine. A needle sweeps the gauge; tap Pour while it's on green.

export function CoffeeRun({ onDone }: GameProps) {
  const [needle, setNeedle] = useState(0);
  const [poured, setPoured] = useState<number | null>(null);
  useLoop(poured === null, (ms) => setNeedle(0.5 + 0.5 * Math.sin(ms / (reducedMotion() ? 900 : 520))));
  const pour = () => {
    if (poured !== null) return;
    const off = Math.abs(needle - 0.5);
    setPoured(off);
    play(off < 0.12 ? "found" : "tap");
    buzz(BUZZ.tap);
    window.setTimeout(() => onDone(off < 0.06 ? 3 : off < 0.14 ? 2 : 1), 1900);
  };
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-6 pb-8">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-40 bg-[repeating-linear-gradient(90deg,#7A5A3E_0_46px,#6E5038_46px_92px)]" />
      {/* The machine */}
      <div className="relative z-10 w-64 rounded-[1.6rem] border-[3px] border-ink bg-[#c23b3b] p-4 shadow-card">
        <div className="rounded-xl border-[3px] border-ink bg-[#1d1a26] px-3 py-2 text-center font-mono text-sm font-bold text-[#7ef0c6]">{poured === null ? "SELECT · POUR" : poured < 0.14 ? "PERFECT CUP" : "ENJOY"}</div>
        <div className="mt-3 h-6 overflow-hidden rounded-full border-[3px] border-ink bg-[#2a2433]" role="meter" aria-label="Pour gauge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(needle * 100)}>
          <div className="relative h-full">
            <span className="absolute inset-y-0 left-[36%] w-[28%] bg-[#e5c349]" />
            <span className="absolute inset-y-0 left-[44%] w-[12%] bg-[#5fd38a]" />
            <span className="absolute inset-y-[-3px] w-1.5 rounded-full bg-cream shadow" style={{ left: `calc(${needle * 100}% - 3px)` }} />
          </div>
        </div>
        <div className="relative mx-auto mt-4 h-28 w-28 rounded-xl border-[3px] border-ink bg-[#14121c]">
          <span className="absolute top-0 left-1/2 h-4 w-6 -translate-x-1/2 rounded-b-md bg-[#8d8d99]" />
          {poured !== null && <span className="absolute top-4 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-[#7a4a22]" style={{ height: 52 }} />}
          <span className={cx("absolute bottom-2 left-1/2 h-12 w-11 -translate-x-1/2 rounded-b-xl border-[3px] border-ink bg-cream transition-transform", poured !== null && "scale-110")}>
            <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-[#7a4a22] transition-[height] duration-1000" style={{ height: poured !== null ? "80%" : "0%" }} />
          </span>
          {poured !== null && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">♨</span>}
        </div>
      </div>
      <button type="button" onClick={pour} disabled={poured !== null} className={cx(big, "relative z-10 size-24 text-2xl")}>
        Pour
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Penalty with Ozzy: three shots. Swipe up from the ball (or tap a side of the goal); Ozzy dives slowly.

export function Penalty({ onDone, keeper }: GameProps & { keeper?: CaseSuspect }) {
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [ozzy, setOzzy] = useState(0.5);
  const [ball, setBall] = useState<{ x: number; goal: boolean } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  useLoop(ball === null && shot < 3, (ms) => setOzzy(0.5 + 0.32 * Math.sin(ms / 700 + shot * 2)));

  const kick = (x: number) => {
    if (ball || shot >= 3) return;
    const target = Math.min(0.92, Math.max(0.08, x));
    // Ozzy covers about a fifth of the goal: generous on purpose.
    const goal = Math.abs(target - ozzy) > 0.17;
    setBall({ x: target, goal });
    play(goal ? "found" : "miss");
    buzz(goal ? BUZZ.crack : BUZZ.miss);
    const total = goals + (goal ? 1 : 0);
    window.setTimeout(() => {
      setGoals(total);
      setBall(null);
      setShot((s) => s + 1);
      if (shot + 1 >= 3) onDone(Math.max(1, total) as Stars);
    }, 1100);
  };

  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s || s.y - e.clientY < 40) return;
        const w = e.currentTarget.clientWidth;
        kick(0.5 + ((e.clientX - s.x) / w) * 1.6);
      }}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[38%] bg-[radial-gradient(ellipse_at_50%_0%,#3c4a7a,#141a33_70%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[20%] h-[12%] bg-[repeating-linear-gradient(90deg,#2b3360_0_10px,#404a85_10px_14px)] opacity-80" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[32%] bottom-0 bg-[repeating-linear-gradient(#2f8f46_0_44px,#2a8040_44px_88px)]" />
      <p className="absolute top-[6%] left-1/2 -translate-x-1/2 rounded-lg border-2 border-ink bg-[#14182c] px-3 py-1 font-mono text-xl font-bold text-mustard">
        <span className="text-[#6fb6ff]">■</span> {goals} – {shot - goals} <span className="text-coral">■</span>
      </p>
      <p className="absolute top-[7%] right-4 flex gap-1.5" aria-label={`Shot ${Math.min(3, shot + 1)} of 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx("size-3 rounded-full border-2 border-cream", i < shot ? "bg-cream" : "bg-transparent")} />
        ))}
      </p>
      {/* The goal, with Ozzy in it */}
      <div className="absolute top-[24%] left-[8%] h-[20%] w-[84%] border-[6px] border-b-0 border-cream bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.18)_0_2px,transparent_2px_12px),repeating-linear-gradient(-45deg,rgba(255,255,255,.18)_0_2px,transparent_2px_12px)]">
        <div className="absolute bottom-0 w-[24%] -translate-x-1/2 transition-[left] duration-100" style={{ left: `${ozzy * 100}%` }}>
          {keeper ? <SuspectPortrait suspect={keeper} mood={ball && !ball.goal ? "smug" : ball?.goal ? "shocked" : "idle"} className="w-full" /> : <span className="block aspect-square rounded-full bg-[#6fb6ff]" />}
        </div>
      </div>
      {/* Taps on either side of the goal kick there too, for anyone who can't swipe. */}
      {[0.2, 0.5, 0.8].map((x) => (
        <button key={x} type="button" aria-label={x < 0.4 ? "Shoot left" : x > 0.6 ? "Shoot right" : "Shoot down the middle"} onClick={() => kick(x)} className="absolute top-[24%] h-[20%] w-[28%] -translate-x-1/2" style={{ left: `${8 + x * 84}%` }} />
      ))}
      {/* The ball */}
      <span
        aria-hidden="true"
        className="absolute size-12 -translate-x-1/2 rounded-full border-[3px] border-ink bg-[radial-gradient(circle_at_35%_35%,#fff,#ddd_60%,#aaa)] transition-all ease-out"
        style={ball ? { left: `${8 + ball.x * 84}%`, top: "32%", transform: "translate(-50%, 0) scale(0.55)", transitionDuration: "700ms" } : { left: "50%", top: "74%", transitionDuration: "0ms" }}
      />
      {ball && <p className="world-bubble absolute top-[50%] left-1/2 -translate-x-1/2 font-display text-4xl text-cream drop-shadow">{ball.goal ? "GOAL!" : "Saved!"}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print it: the maker space's 3D printer. The head sweeps a layer; tap to drop it on the stack.

const LAYERS = 6;

export function PrintIt({ onDone }: GameProps) {
  const [stack, setStack] = useState<{ x: number; w: number }[]>([{ x: 0.3, w: 0.4 }]);
  const [head, setHead] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const top = stack[stack.length - 1];
  const done = stack.length > LAYERS;
  useLoop(!done, (ms) => setHead((0.5 + 0.5 * Math.sin(ms / (reducedMotion() ? 1100 : 650))) * (1 - top.w)));

  const drop = () => {
    if (done) return;
    const lo = Math.max(head, top.x);
    const hi = Math.min(head + top.w, top.x + top.w);
    // Never less than a sliver: a miss just prints a thinner piece.
    const w = Math.max(0.06, hi - lo);
    const x = hi - lo >= 0.06 ? lo : top.x + top.w / 2 - 0.03;
    const next = [...stack, { x, w }];
    setStack(next);
    const kept = w / top.w;
    setNote(kept > 0.92 ? "Perfect!" : kept > 0.6 ? "Nice" : "Close");
    play(kept > 0.92 ? "found" : "tap");
    buzz(BUZZ.tap);
    if (next.length > LAYERS) {
      const ratio = w / 0.4;
      window.setTimeout(() => onDone(ratio > 0.75 ? 3 : ratio > 0.45 ? 2 : 1), 900);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8" onPointerDown={drop}>
      <div className="relative h-80 w-72 rounded-2xl border-[3px] border-ink bg-[linear-gradient(#2c3352,#151a2e)] shadow-card">
        <span className="absolute inset-x-3 top-3 h-1.5 rounded-full bg-cream/70" />
        <div className="absolute inset-x-6 top-6 bottom-12">
          {!done && (
            <span className="absolute top-0 h-5 rounded-md bg-mustard shadow-[0_0_14px_rgba(242,179,61,.7)]" style={{ left: `${head * 100}%`, width: `${top.w * 100}%` }}>
              <span className="absolute -top-4 left-1/2 size-5 -translate-x-1/2 rounded-md border-2 border-ink bg-[#c9cbd6]" />
            </span>
          )}
          {stack.map((l, i) => (
            <span key={i} className="absolute h-5 rounded-sm border-2 border-ink bg-mustard" style={{ left: `${l.x * 100}%`, width: `${l.w * 100}%`, bottom: `${i * 20}px` }} />
          ))}
          {note && !done && <p className="world-bubble absolute top-10 inset-x-0 text-center font-printer text-3xl text-teal" key={stack.length}>{note}</p>}
        </div>
        <span className="absolute inset-x-4 bottom-4 h-6 rounded-md bg-[repeating-linear-gradient(90deg,#4a5070_0_10px,#3a3f5a_10px_14px)]" />
      </div>
      <button type="button" onClick={(e) => (e.stopPropagation(), drop())} disabled={done} aria-label={`Drop layer ${Math.min(LAYERS, stack.length)} of ${LAYERS}`} className={cx(big, "size-24 text-2xl")}>
        TAP
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rewire: the corridor's fuse cupboard. Turn tiles until power runs from the plug to the socket.

type Kind = "straight" | "corner" | "tee";

/**
 * A 3×3 board, row by row (0 1 2 / 3 4 5 / 6 7 8): power comes in on the left of 3, goes up through 0, across 1,
 * down through 2 into 5 and out on the right. The other tiles are scenery. `SOLVED` are the turns that connect it.
 */
const KINDS: Kind[] = ["corner", "straight", "corner", "corner", "tee", "corner", "straight", "corner", "straight"];
const SOLVED: Record<number, number> = { 3: 3, 0: 1, 1: 0, 2: 2, 5: 0 };
/** How far each path tile starts from solved: seven taps fix it, so it's quick. */
const START: Record<number, number> = { 3: 2, 0: 3, 1: 1, 2: 2, 5: 3 };
const FAIR_TAPS = 7;
/** After this long a "fix it for me" shows: nobody gets stuck in a side job. */
const HAND_MS = 25_000;

/** Which sides a tile opens to at a turn (0 = up, 1 = right, 2 = down, 3 = left). */
function sides(kind: Kind, turn: number): number[] {
  const base = kind === "straight" ? [1, 3] : kind === "corner" ? [0, 1] : [1, 2, 3];
  return base.map((s) => (s + turn) % 4);
}
const opens = (i: number) => sides(KINDS[i], SOLVED[i]);
const connected = (turns: number[]) => Object.keys(SOLVED).every((k) => opens(Number(k)).every((s) => sides(KINDS[Number(k)], turns[Number(k)]).includes(s)));

export function Rewire({ onDone }: GameProps) {
  const [turns, setTurns] = useState(() => KINDS.map((_, i) => (i in SOLVED ? (SOLVED[i] + START[i]) % 4 : (i * 3) % 4)));
  const [taps, setTaps] = useState(0);
  const [lit, setLit] = useState(false);
  const [hand, setHand] = useState(false);
  useLoop(!lit && !hand, (ms) => ms > HAND_MS && setHand(true));

  const finish = (stars: Stars) => {
    setLit(true);
    play("granted");
    window.setTimeout(() => onDone(stars), 1100);
  };
  const turn = (i: number) => {
    if (lit) return;
    const next = turns.map((t, j) => (j === i ? (t + 1) % 4 : t));
    setTurns(next);
    setTaps((n) => n + 1);
    play("tick");
    if (connected(next)) finish(taps + 1 <= FAIR_TAPS + 2 ? 3 : taps + 1 <= FAIR_TAPS + 9 ? 2 : 1);
  };

  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative rounded-3xl border-[3px] border-ink bg-[#26283a] p-5 shadow-card">
        <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-mustard px-3 text-sm font-black text-ink" aria-hidden="true">
          ⚡
        </span>
        <span className={cx("absolute top-[calc(50%-0.75rem)] -left-5 h-6 w-7 rounded-md border-2 border-ink", lit ? "bg-mustard" : "bg-coral")} aria-hidden="true" />
        <span className={cx("absolute top-[calc(50%-0.875rem)] -right-5 size-7 rounded-full border-2 border-ink", lit ? "bg-mustard shadow-[0_0_18px_#f2b33d]" : "bg-[#3a3d55]")} aria-hidden="true" />
        <ul className="mt-5 grid grid-cols-3 gap-2" aria-label="The fuse board">
          {KINDS.map((kind, i) => {
            const live = lit && i in SOLVED;
            return (
              <li key={i}>
                <button type="button" onClick={() => turn(i)} aria-label={`Tile ${i + 1}: turn it`} className="relative grid size-20 place-items-center rounded-xl border-2 border-ink bg-[#33364c] active:scale-95">
                  <svg viewBox="0 0 40 40" className="size-full transition-transform duration-150" style={{ transform: `rotate(${turns[i] * 90}deg)` }} aria-hidden="true">
                    {sides(kind, 0).map((s) => (
                      <line key={s} x1="20" y1="20" x2={s === 1 ? 40 : s === 3 ? 0 : 20} y2={s === 0 ? 0 : s === 2 ? 40 : 20} stroke={live ? "#f2b33d" : "#b08a52"} strokeWidth="7" strokeLinecap="round" />
                    ))}
                    <circle cx="20" cy="20" r="5" fill={live ? "#f2b33d" : "#b08a52"} />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
        {hand && !lit && (
          <button type="button" onClick={() => finish(1)} className="mt-4 w-full rounded-full border-2 border-ink bg-cream px-3 py-1.5 text-sm font-extrabold text-ink">
            Fix it for me
          </button>
        )}
      </div>
    </div>
  );
}
