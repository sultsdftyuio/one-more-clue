"use client";

import { type CSSProperties, useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { buzz, BUZZ } from "@/components/game/haptics";
import { SuspectPortrait } from "@/components/game/parts";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { reducedMotion, useLoop, type GameProps, type Stars } from "./frame";
import { CupboardScene, LobbyScene, MakerScene, PitchScene, Sparks } from "./scenes";

const big = "rounded-full border-[3px] border-ink bg-mustard font-display text-ink shadow-pop-sm active:translate-y-1 active:shadow-none";

// ---------------------------------------------------------------------------
// Coffee run: the lobby's drinks machine. A needle sweeps the gauge on its face; tap Pour while it's on green.
// A coin drops, a cup lands, coffee pours and steams, and the display rates the cup.

export function CoffeeRun({ onDone }: GameProps) {
  const [needle, setNeedle] = useState(0);
  const [poured, setPoured] = useState<number | null>(null);
  const [stage, setStage] = useState(0);
  useLoop(poured === null, (ms) => setNeedle(0.5 + 0.5 * Math.sin(ms / (reducedMotion() ? 900 : 520))));
  const pour = () => {
    if (poured !== null) return;
    const off = Math.abs(needle - 0.5);
    setPoured(off);
    play("tick");
    buzz(BUZZ.tap);
    window.setTimeout(() => (setStage(1), play("tap")), 250);
    window.setTimeout(() => (setStage(2), play(off < 0.14 ? "found" : "tap")), 700);
    window.setTimeout(() => setStage(3), 1500);
    window.setTimeout(() => onDone(off < 0.06 ? 3 : off < 0.14 ? 2 : 1), 2400);
  };
  const rating = poured === null ? null : poured < 0.06 ? "PERFECT CUP" : poured < 0.14 ? "GOOD CUP" : "IT'S COFFEE";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-5 pb-16">
      <LobbyScene />
      {/* the machine */}
      <div className={cx("relative z-10 w-[min(17rem,70vw)] rounded-[1.6rem] border-[4px] border-ink sm:w-[21rem] bg-[linear-gradient(90deg,#B8323E,#D9484F_40%,#B8323E)] p-4 shadow-card", stage === 1 && "animate-shake")}>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border-[3px] border-ink bg-[#121019] px-2 py-1.5 text-center font-mono text-sm font-bold tracking-widest text-[#7ef0c6] [text-shadow:0_0_8px_#7ef0c6]">
            {rating ?? "SELECT · POUR"}
          </div>
          <span className="relative h-10 w-5 rounded-md border-[3px] border-ink bg-[#2a2433]" aria-hidden="true">
            {stage >= 1 && <span className="world-coin absolute -top-6 left-1/2 size-4 -translate-x-1/2 rounded-full border-2 border-ink bg-mustard" />}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {["#6F4A2C", "#E8E2D0", "#3FB8AF", "#F2B33D", "#8E74E8", "#E8574A"].map((c) => (
            <span key={c} className="h-5 rounded-md border-2 border-ink" style={{ background: c }} />
          ))}
        </div>
        <div className="mt-3 rounded-full border-[3px] border-ink bg-[#2a2433] p-1" role="meter" aria-label="Pour gauge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(needle * 100)}>
          <div className="relative h-5 overflow-hidden rounded-full bg-[#3a3346]">
            <span className="absolute inset-y-0 left-[34%] w-[32%] bg-[#e5c349]" />
            <span className="absolute inset-y-0 left-[44%] w-[12%] bg-[#5fd38a] shadow-[0_0_10px_#5fd38a]" />
            <span className="absolute inset-y-[-2px] w-2 rounded-full border border-ink bg-cream" style={{ left: `calc(${needle * 100}% - 4px)` }} />
          </div>
        </div>
        {/* the dispenser */}
        <div className="relative mx-auto mt-4 h-32 w-32 overflow-hidden rounded-xl border-[3px] border-ink bg-[radial-gradient(circle_at_50%_20%,#3a3150,#14121c)]">
          <span className="absolute top-0 left-1/2 h-5 w-8 -translate-x-1/2 rounded-b-lg border-2 border-t-0 border-ink bg-[#8d8d99]" />
          {stage >= 2 && <span className="absolute top-5 left-1/2 h-[4.2rem] w-2 -translate-x-1/2 rounded-full bg-[#6F4A2C] world-pour" />}
          <span className={cx("absolute bottom-2 left-1/2 h-14 w-12 -translate-x-1/2 rounded-b-2xl border-[3px] border-ink bg-cream transition-transform duration-300", stage >= 1 ? "translate-y-0" : "-translate-y-24")}>
            <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-[#6F4A2C] transition-[height] duration-700" style={{ height: stage >= 2 ? "82%" : "0%" }} />
            <span className="absolute top-1/2 -right-3 h-6 w-3 rounded-r-full border-[3px] border-l-0 border-ink" />
          </span>
          {stage >= 3 && (
            <span className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="world-steam block h-5 w-1.5 rounded-full bg-cream/70" style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </span>
          )}
        </div>
      </div>
      <button type="button" onClick={pour} disabled={poured !== null} className={cx(big, "relative z-10 grid size-24 place-items-center text-2xl")}>
        Pour
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Penalty with Ozzy, under the floodlights: three shots. Swipe up (a line shows where it will go) or tap the spot in
// the goal to aim at. Ozzy sways along his line and dives when you shoot; he covers about a fifth of the goal,
// generous on purpose.

const FLY_MS = 620;
type Kick = { goal: boolean; from: [number, number]; to: [number, number]; side: number; at: number };

function Football({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#FFFFFF" stroke="#141829" strokeWidth="3" />
      <path d="M20 12l6 4.5-2.3 7h-7.4l-2.3-7Z" fill="#141829" />
      <path d="M20 12V3.5M26 16.5l8-3M23.7 23.5l5 6.5M16.3 23.5l-5 6.5M14 16.5l-8-3" stroke="#141829" strokeWidth="2" />
      <ellipse cx="13" cy="10" rx="5" ry="2.5" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
}

export function Penalty({ onDone, keeper }: GameProps & { keeper?: CaseSuspect }) {
  const [shot, setShot] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [ozzy, setOzzy] = useState(0.5);
  const [dive, setDive] = useState<{ to: number; turn: number } | null>(null);
  const [kick, setKick] = useState<Kick | null>(null);
  const [t, setT] = useState(0);
  const [aim, setAim] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [cheer, setCheer] = useState(0);
  const [jolt, setJolt] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const goalBox = useRef<HTMLDivElement>(null);
  const spot = useRef<HTMLSpanElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  useLoop(kick === null && shot < 3, (ms) => setOzzy(0.5 + 0.32 * Math.sin(ms / 700 + shot * 2)));
  useLoop(kick !== null && t < 1, () => kick && setT(reducedMotion() ? 1 : Math.min(1, (performance.now() - kick.at) / FLY_MS)));
  const goals = results.filter(Boolean).length;

  /** Where the boxes are, in the play area's pixels. */
  const frame = () => {
    const a = area.current?.getBoundingClientRect();
    const g = goalBox.current?.getBoundingClientRect();
    const s = spot.current?.getBoundingClientRect();
    return a && g && s ? { a, g, ball: [s.left + s.width / 2 - a.left, s.top + s.height / 2 - a.top] as [number, number] } : null;
  };
  /** A swipe's direction, carried on from the ball to the goal's middle: the share across the goal it points at. */
  const aimed = (dx: number, dy: number) => {
    const f = frame();
    if (!f || dy > -10) return null;
    const goalY = f.g.top + f.g.height * 0.55 - f.a.top;
    const x = f.ball[0] + (dx * (goalY - f.ball[1])) / dy;
    return { share: (x + f.a.left - f.g.left) / f.g.width, from: f.ball, to: [x, goalY] as [number, number] };
  };

  const shoot = (gx: number, gy = 0.55) => {
    const f = frame();
    if (kick || shot >= 3 || !f) return;
    const x = Math.min(0.92, Math.max(0.08, gx));
    const y = Math.min(0.8, Math.max(0.25, gy));
    const goal = Math.abs(x - ozzy) > 0.17;
    const left = x < ozzy;
    // Saved: he flies at the ball. Scored: he guessed the other way.
    setDive(goal ? { to: Math.min(0.86, Math.max(0.14, ozzy + (left ? 0.18 : -0.18))), turn: left ? 62 : -62 } : { to: x, turn: left ? -62 : 62 });
    setKick({ goal, from: f.ball, to: [f.g.left + x * f.g.width - f.a.left, f.g.top + y * f.g.height - f.a.top], side: left ? -1 : 1, at: performance.now() });
    setT(0);
    setAim(null);
    play("whoosh");
    buzz(BUZZ.tap);
    window.setTimeout(() => {
      play(goal ? "found" : "miss");
      buzz(goal ? BUZZ.crack : BUZZ.miss);
      setResults((r) => [...r, goal]);
      if (goal) {
        setCheer(Date.now());
        setJolt(true);
        window.setTimeout(() => setJolt(false), 420);
      }
    }, reducedMotion() ? 0 : FLY_MS);
    const total = goals + (goal ? 1 : 0);
    window.setTimeout(() => {
      setKick(null);
      setDive(null);
      setShot((n) => n + 1);
      if (shot + 1 >= 3) onDone(Math.max(1, total) as Stars);
    }, 2000);
  };

  // The ball's flight: quick off the boot, a little rise, smaller as it goes, spinning.
  const fly = kick ? t : 0;
  const ease = 1 - (1 - fly) ** 2;
  const bx = kick ? kick.from[0] + (kick.to[0] - kick.from[0]) * ease : 0;
  const by = kick ? kick.from[1] + (kick.to[1] - kick.from[1]) * ease - Math.sin(Math.PI * fly) * 50 : 0;
  const landed = Boolean(kick && t >= 1);
  const said = landed && kick ? (kick.goal ? "GOAL!" : "SAVED!") : null;
  const mood = landed && kick ? (kick.goal ? "shocked" : "smug") : kick ? "nervous" : "idle";

  return (
    <div
      ref={area}
      className={cx("absolute inset-0 touch-none overflow-hidden", jolt && "animate-shake")}
      onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerMove={(e) => {
        const s = swipe.current;
        if (!s || kick) return;
        const at = s.y - e.clientY > 24 ? aimed(e.clientX - s.x, e.clientY - s.y) : null;
        setAim(at ? { from: at.from, to: at.to } : null);
      }}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        setAim(null);
        if (!s || s.y - e.clientY < 40) return;
        const at = aimed(e.clientX - s.x, e.clientY - s.y);
        if (at) shoot(at.share);
      }}
      onPointerCancel={() => {
        swipe.current = null;
        setAim(null);
      }}
    >
      <PitchScene cheer={cheer} />
      {/* The goal, standing on its line, with the boards behind it, the grass and the six-yard box in front. */}
      <div className="absolute top-[30%] left-1/2 w-[min(86vw,36rem)] -translate-x-1/2 sm:top-[22%]">
        <div aria-hidden="true" className="absolute top-full left-1/2 h-[100vh] w-[300vw] -translate-x-1/2 bg-[repeating-linear-gradient(#2a8040_0_38px,#2f8f46_38px_84px)]" />
        <div aria-hidden="true" className="absolute bottom-0 left-1/2 flex h-[26%] w-[300vw] -translate-x-1/2 border-y-[3px] border-ink">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className={cx("grid flex-1 place-items-center font-display text-[min(3vw,1rem)] tracking-widest", i % 2 ? "bg-[#E8574A] text-cream" : "bg-[#1F2A5C] text-mustard")}>
              {i % 2 ? "HALDEN" : "★ ★ ★"}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="absolute top-full left-1/2 h-[3px] w-[300vw] -translate-x-1/2 bg-cream/80" />
        <svg aria-hidden="true" viewBox="0 0 300 60" preserveAspectRatio="none" className="absolute top-full left-1/2 h-[42%] w-[150%] -translate-x-1/2">
          <path d="M36 0 L16 60 M264 0 L284 60 M16 58 L284 58" stroke="#F4EEE4" strokeOpacity="0.8" strokeWidth="3" fill="none" />
        </svg>
        <div ref={goalBox} className="relative aspect-[2.6/1] w-full">
          <div
            key={cheer}
            aria-hidden="true"
            className={cx(
              "absolute inset-0 border-[7px] border-b-0 border-cream bg-[rgba(10,14,36,0.35)] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.22)_0_2px,transparent_2px_13px),repeating-linear-gradient(-45deg,rgba(255,255,255,.22)_0_2px,transparent_2px_13px)] shadow-[0_0_0_3px_#141829,inset_0_0_0_3px_#141829]",
              cheer > 0 && "world-net",
            )}
          />
          <div className="absolute bottom-0 w-[26%] -translate-x-1/2" style={{ left: `${(dive?.to ?? ozzy) * 100}%`, transition: dive ? "left 300ms ease-out" : "none" }}>
            <div style={{ transform: dive ? `rotate(${dive.turn}deg) translateY(12%)` : "none", transformOrigin: "50% 92%", transition: "transform 300ms ease-out" }}>
              {keeper ? (
                <SuspectPortrait suspect={keeper} mood={mood} className="w-full drop-shadow-[0_6px_0_rgba(20,24,41,0.35)]" />
              ) : (
                <span className="block aspect-square rounded-full bg-[#6fb6ff]" />
              )}
            </div>
          </div>
          {/* Tap where you want it to go; the keyboard picks left, middle or right. */}
          {[0.2, 0.5, 0.8].map((x) => (
            <button
              key={x}
              type="button"
              aria-label={x < 0.4 ? "Shoot left" : x > 0.6 ? "Shoot right" : "Shoot down the middle"}
              onClick={(e) => {
                const g = goalBox.current?.getBoundingClientRect();
                if (e.detail === 0 || !g) return shoot(x);
                shoot((e.clientX - g.left) / g.width, (e.clientY - g.top) / g.height);
              }}
              className="absolute inset-y-0 w-1/3 focus-visible:outline-4 focus-visible:outline-mustard"
              style={{ left: `${(x - 0.2) * (100 / 0.9)}%` }}
            />
          ))}
        </div>
      </div>
      {/* The scoreboard */}
      <div className="absolute top-[5.5rem] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-xl border-[3px] border-ink bg-[#10142a] px-4 py-1.5 shadow-pop-sm">
        <p className="flex items-center gap-3 font-mono text-lg font-bold text-cream">
          <span className="text-[10px] font-black tracking-widest text-mustard">YOU</span>
          <span className="text-2xl text-mustard">{goals}</span>
          <span className="text-cream/50">:</span>
          <span className="text-2xl text-coral">{results.length - goals}</span>
          <span className="text-[10px] font-black tracking-widest text-coral">OZZY</span>
        </p>
        <p className="flex gap-1.5" aria-label={`Shot ${Math.min(3, shot + 1)} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx("grid size-4 place-items-center rounded-full border-2 border-cream/70 text-[9px] font-black text-ink", results[i] === true ? "bg-[#5FD38A]" : results[i] === false ? "bg-coral" : "bg-transparent")}>
              {results[i] === true ? "✓" : results[i] === false ? "✕" : ""}
            </span>
          ))}
        </p>
      </div>
      {/* The spot and the ball on it */}
      <span ref={spot} aria-hidden="true" className="absolute bottom-[22%] left-1/2 grid size-14 -translate-x-1/2 place-items-center">
        <span className="absolute bottom-0 h-3 w-16 rounded-[50%] bg-cream/80" />
        {!kick && shot < 3 && <Football className="relative size-14 drop-shadow-[0_6px_2px_rgba(0,0,0,0.35)]" />}
      </span>
      {!kick && shot === 0 && !aim && (
        <span aria-hidden="true" className="world-bubble pointer-events-none absolute bottom-[calc(22%+4.5rem)] left-1/2 -translate-x-1/2 text-4xl text-cream/90 drop-shadow">
          ⇡
        </span>
      )}
      {/* Where the swipe is pointing */}
      {aim && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
          <line x1={aim.from[0]} y1={aim.from[1]} x2={aim.to[0]} y2={aim.to[1]} stroke="#F2B33D" strokeWidth="5" strokeDasharray="10 9" strokeLinecap="round" />
          <circle cx={aim.to[0]} cy={aim.to[1]} r="16" fill="none" stroke="#F2B33D" strokeWidth="4" />
          <circle cx={aim.to[0]} cy={aim.to[1]} r="4" fill="#F2B33D" />
        </svg>
      )}
      {/* The ball in the air: into the net, or palmed away */}
      {kick && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: bx,
            top: by,
            transform: landed && !kick.goal ? `translate(${kick.side * 110}px, 150px)` : "none",
            opacity: landed && !kick.goal ? 0 : 1,
            transition: landed ? "transform 600ms ease-in, opacity 600ms ease-in" : "none",
          }}
        >
          <Football className="size-14 -translate-x-1/2 -translate-y-1/2" style={{ transform: `scale(${1 - 0.55 * ease}) rotate(${fly * 720}deg)` }} />
        </span>
      )}
      {said && (
        <p
          className={cx(
            "world-pop pointer-events-none absolute top-[54%] left-1/2 -translate-x-1/2 font-display text-6xl [-webkit-text-stroke:2px_#141829] [paint-order:stroke] drop-shadow-[0_5px_0_#141829]",
            kick?.goal ? "text-mustard" : "text-coral",
          )}
        >
          {said}
        </p>
      )}
      <Sparks fire={cheer} x={50} y={30} colour="#F2B33D" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print it: the maker space's 3D printer. The nozzle sweeps a layer; tap to drop it on the stack. What hangs over the
// edge is trimmed off and falls away; a near-perfect layer flashes "Perfect!".

const LAYERS = 6;

export function PrintIt({ onDone }: GameProps) {
  const [stack, setStack] = useState<{ x: number; w: number }[]>([{ x: 0.3, w: 0.4 }]);
  const [head, setHead] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [trim, setTrim] = useState<{ x: number; w: number; key: number } | null>(null);
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
    const cut = top.w - w;
    if (cut > 0.01) setTrim({ x: head < top.x ? head : x + w, w: Math.min(top.w, cut), key: Date.now() });
    const kept = w / top.w;
    setNote(kept > 0.92 ? "Perfect!" : kept > 0.6 ? "Nice" : "Close");
    play(kept > 0.92 ? "found" : "tap");
    buzz(BUZZ.tap);
    if (next.length > LAYERS) {
      const ratio = w / 0.4;
      window.setTimeout(() => onDone(ratio > 0.75 ? 3 : ratio > 0.45 ? 2 : 1), 1000);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-6 pb-16" onPointerDown={drop}>
      <MakerScene />
      <div className="relative z-10 h-[min(22rem,52vh)] w-[min(19rem,78vw)] rounded-2xl sm:h-[min(26rem,58vh)] sm:w-[24rem] border-[4px] border-ink bg-[linear-gradient(#3a4166,#1b2038)] p-3 shadow-card">
        {/* the frame and gantry */}
        <span className="absolute inset-x-3 top-3 h-2 rounded-full bg-[#c9cbd6]" aria-hidden="true" />
        <span className="absolute top-3 bottom-12 left-3 w-2 rounded-full bg-[#8d93a3]" aria-hidden="true" />
        <span className="absolute top-3 right-3 bottom-12 w-2 rounded-full bg-[#8d93a3]" aria-hidden="true" />
        <div className="absolute inset-x-7 top-7 bottom-14 overflow-hidden">
          {!done && (
            <span className="absolute top-0 h-5 rounded-md bg-[#F29A4A] shadow-[0_0_16px_rgba(242,154,74,0.8)]" style={{ left: `${head * 100}%`, width: `${top.w * 100}%` }}>
              <span className="absolute -top-5 left-1/2 h-6 w-7 -translate-x-1/2 rounded-md border-[3px] border-ink bg-[#c9cbd6]" />
              <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[#FFE08A] shadow-[0_0_8px_#FFE08A]" />
            </span>
          )}
          {stack.map((l, i) => (
            <span
              key={i}
              className="absolute h-5 rounded-sm border-2 border-ink bg-[linear-gradient(#FFB46B,#E8862F)]"
              style={{ left: `${l.x * 100}%`, width: `${l.w * 100}%`, bottom: `${i * 20}px` }}
            />
          ))}
          {trim && <span key={trim.key} className="world-trim absolute h-5 rounded-sm border-2 border-ink bg-[#E8862F]" style={{ left: `${trim.x * 100}%`, width: `${trim.w * 100}%`, bottom: `${(stack.length - 1) * 20}px` }} />}
          {note && !done && (
            <p className="world-count absolute inset-x-0 top-10 text-center font-printer text-4xl text-[#7ef0c6] [text-shadow:0_0_10px_#3fb8af]" key={stack.length}>
              {note}
            </p>
          )}
        </div>
        <span className="absolute inset-x-4 bottom-4 h-7 rounded-md border-2 border-ink bg-[repeating-linear-gradient(90deg,#4a5070_0_10px,#3a3f5a_10px_14px)]" aria-hidden="true" />
        <span className="absolute bottom-5 left-6 flex gap-1" aria-hidden="true">
          {Array.from({ length: LAYERS }, (_, i) => (
            <span key={i} className={cx("size-2.5 rounded-full border border-ink", i < stack.length - 1 ? "bg-[#7ef0c6]" : "bg-[#2a2f45]")} />
          ))}
        </span>
      </div>
      <button type="button" onClick={(e) => (e.stopPropagation(), drop())} disabled={done} aria-label={`Drop layer ${Math.min(LAYERS, stack.length)} of ${LAYERS}`} className={cx(big, "relative z-10 size-24 text-2xl")}>
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

/** The tiles power reaches from the plug (in on the left of tile 3), following open sides that meet. */
function powered(turns: number[]): Set<number> {
  const on = new Set<number>();
  if (!sides(KINDS[3], turns[3]).includes(3)) return on;
  const queue = [3];
  on.add(3);
  const step: Record<number, [number, number]> = { 0: [-1, 0], 1: [0, 1], 2: [1, 0], 3: [0, -1] };
  while (queue.length) {
    const i = queue.shift()!;
    const r = Math.floor(i / 3);
    const c = i % 3;
    for (const side of sides(KINDS[i], turns[i])) {
      const [dr, dc] = step[side];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
      const j = nr * 3 + nc;
      if (on.has(j) || !sides(KINDS[j], turns[j]).includes((side + 2) % 4)) continue;
      on.add(j);
      queue.push(j);
    }
  }
  return on;
}

export function Rewire({ onDone }: GameProps) {
  const [turns, setTurns] = useState(() => KINDS.map((_, i) => (i in SOLVED ? (SOLVED[i] + START[i]) % 4 : (i * 3) % 4)));
  const [taps, setTaps] = useState(0);
  const [lit, setLit] = useState(false);
  const [hand, setHand] = useState(false);
  const [spark, setSpark] = useState(0);
  useLoop(!lit && !hand, (ms) => ms > HAND_MS && setHand(true));
  const live = powered(turns);

  const finish = (stars: Stars) => {
    setLit(true);
    setSpark(Date.now());
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
      <CupboardScene lit={lit} />
      <div className={cx("relative rounded-3xl border-[4px] border-ink bg-[linear-gradient(#8D93A3,#6B7184)] p-3 shadow-card", lit && "shadow-[0_0_60px_12px_rgba(242,179,61,0.45)]")}>
      <div className="relative rounded-2xl border-[3px] border-ink bg-[#26283a] p-5">
        <Sparks fire={spark} x={100} y={50} />
        <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-mustard px-3 text-sm font-black text-ink" aria-hidden="true">
          ⚡
        </span>
        <span className={cx("absolute top-[calc(50%-0.75rem)] -left-5 h-6 w-7 rounded-md border-2 border-ink", lit ? "bg-mustard" : "bg-coral")} aria-hidden="true" />
        <span className={cx("absolute top-[calc(50%-0.875rem)] -right-5 size-7 rounded-full border-2 border-ink", lit ? "bg-mustard shadow-[0_0_18px_#f2b33d]" : "bg-[#3a3d55]")} aria-hidden="true" />
        <ul className="mt-5 grid grid-cols-3 gap-2" aria-label="The fuse board">
          {KINDS.map((kind, i) => {
            const hot = live.has(i);
            return (
              <li key={i}>
                <button type="button" onClick={() => turn(i)} aria-label={`Tile ${i + 1}: turn it`} className="relative grid size-20 place-items-center rounded-xl border-2 border-ink bg-[#33364c] active:scale-95 sm:size-24">
                  <svg viewBox="0 0 40 40" className="size-full transition-transform duration-150" style={{ transform: `rotate(${turns[i] * 90}deg)` }} aria-hidden="true">
                    {sides(kind, 0).map((s) => (
                      <line key={s} x1="20" y1="20" x2={s === 1 ? 40 : s === 3 ? 0 : 20} y2={s === 0 ? 0 : s === 2 ? 40 : 20} stroke={hot ? "#f2b33d" : "#b08a52"} strokeWidth="7" strokeLinecap="round" style={hot ? { filter: "drop-shadow(0 0 4px #f2b33d)" } : undefined} />
                    ))}
                    <circle cx="20" cy="20" r="5" fill={hot ? "#f2b33d" : "#b08a52"} />
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
    </div>
  );
}
