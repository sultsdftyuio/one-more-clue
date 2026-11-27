"use client";

/**
 * The bigger building's three side games (2026-11-27), one for each new room that would otherwise only fill up in
 * later chapters: pack the demo case in the professor's office, watch the monitors in the security office, time the
 * barrier at the North Gate. Like the others they're short, generous and only ever help a bit: nothing in them is a
 * clue, and none of them shows a person, a camera that isn't in the case file, or a car like the one in the story.
 */
import { useMemo, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { buzz, BUZZ } from "@/components/game/haptics";
import { cx } from "@/lib/cx";
import { reducedMotion, useLoop, type GameProps, type Stars } from "./frame";
import { CarParkScene, OfficeScene, SecurityScene } from "./scenes";

const big = "rounded-full border-[3px] border-ink bg-mustard font-display text-ink shadow-pop-sm active:translate-y-1 active:shadow-none";

// ---------------------------------------------------------------------------
// Pack the demo case: the investor demo's flight case, open on the professor's floor. One piece at a time shows on
// top; tap the foam slot it fits. A wrong slot only wobbles, and after two misses the right one glows.

type Piece = { id: string; name: string; colour: string; shape: "charger" | "cable" | "battery" | "cloth" | "card" };

const PIECES: Piece[] = [
  { id: "cable", name: "the cable", colour: "#3F6FA0", shape: "cable" },
  { id: "charger", name: "the charger", colour: "#E8E6DE", shape: "charger" },
  { id: "battery", name: "the spare battery", colour: "#F2B33D", shape: "battery" },
  { id: "cloth", name: "the lens cloth", colour: "#9FD6CF", shape: "cloth" },
  { id: "card", name: "the demo card", colour: "#F2EFE6", shape: "card" },
];
/** Where each piece's slot sits in the foam, left to right, top row then bottom: not the order they come in. */
const SLOTS = ["battery", "card", "cable", "cloth", "charger"];

function PieceArt({ piece, className }: { piece: Piece; className?: string }) {
  const ink = "#141829";
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      {piece.shape === "cable" && (
        <g fill="none" stroke={piece.colour} strokeWidth="7" strokeLinecap="round">
          <circle cx="40" cy="40" r="24" />
          <circle cx="40" cy="40" r="13" />
          <path d="M64 40 h10" />
        </g>
      )}
      {piece.shape === "charger" && (
        <g stroke={ink} strokeWidth="3">
          <rect x="18" y="24" width="44" height="40" rx="6" fill={piece.colour} />
          <rect x="28" y="10" width="6" height="16" fill="#9AA3B8" />
          <rect x="46" y="10" width="6" height="16" fill="#9AA3B8" />
          <circle cx="40" cy="48" r="4" fill="#3DD68C" />
        </g>
      )}
      {piece.shape === "battery" && (
        <g stroke={ink} strokeWidth="3">
          <rect x="26" y="14" width="28" height="56" rx="5" fill={piece.colour} />
          <rect x="34" y="8" width="12" height="7" fill="#9AA3B8" />
          <path d="M42 28 l-8 14 h8 l-4 14" fill="none" strokeWidth="3.5" />
        </g>
      )}
      {piece.shape === "cloth" && (
        <g stroke={ink} strokeWidth="3">
          <path d="M14 22 L58 14 L66 58 L22 66 Z" fill={piece.colour} />
          <path d="M20 40 L62 34" fill="none" strokeOpacity="0.4" />
        </g>
      )}
      {piece.shape === "card" && (
        <g stroke={ink} strokeWidth="3">
          <rect x="10" y="22" width="60" height="38" rx="5" fill={piece.colour} />
          <path d="M18 34 h30 M18 44 h40 M18 52 h22" strokeWidth="2.5" strokeOpacity="0.5" />
        </g>
      )}
    </svg>
  );
}

export function PackCase({ onDone }: GameProps) {
  const [next, setNext] = useState(0);
  const [misses, setMisses] = useState(0);
  const [missesHere, setMissesHere] = useState(0);
  const [wobble, setWobble] = useState<string | null>(null);
  const piece = PIECES[next] ?? null;
  const packed = new Set(PIECES.slice(0, next).map((p) => p.id));

  const pick = (slot: string) => {
    if (!piece || packed.has(slot)) return;
    if (slot !== piece.id) {
      setMisses((m) => m + 1);
      setMissesHere((m) => m + 1);
      setWobble(slot);
      window.setTimeout(() => setWobble(null), 380);
      play("tick");
      buzz(BUZZ.tap);
      return;
    }
    play(next === PIECES.length - 1 ? "found" : "tap");
    buzz(BUZZ.tap);
    setMissesHere(0);
    const after = next + 1;
    setNext(after);
    if (after === PIECES.length) {
      const stars: Stars = misses <= 1 ? 3 : misses <= 3 ? 2 : 1;
      window.setTimeout(() => onDone(stars), 900);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-5 pb-14">
      <OfficeScene />
      {/* the piece to pack */}
      <div className="relative z-10 flex h-28 items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 shadow-pop-sm" aria-live="polite">
        {piece ? (
          <>
            <PieceArt key={piece.id} piece={piece} className="size-20 animate-pop-in" />
            <p className="font-display text-lg text-ink">Pack {piece.name}</p>
          </>
        ) : (
          <p className="font-display text-xl text-ink">All packed for 9 AM</p>
        )}
      </div>
      {/* the case, open */}
      <div className="relative z-10 w-[min(22rem,88vw)] rounded-[1.4rem] border-[4px] border-ink bg-[linear-gradient(#C9CDD6,#9AA3B8)] p-3 shadow-card sm:w-[26rem]">
        <div className="grid grid-cols-3 gap-2 rounded-xl border-[3px] border-ink bg-[#2B2F3A] p-2.5">
          {SLOTS.map((id) => {
            const p = PIECES.find((x) => x.id === id)!;
            const done = packed.has(id);
            const hint = piece?.id === id && missesHere >= 2;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-label={done ? `${p.name}, packed` : `The slot for ${p.name}`}
                className={cx(
                  "relative grid aspect-square place-items-center rounded-lg border-[3px] border-[#141829] bg-[#3A3F4E] transition-transform",
                  wobble === id && "animate-shake",
                  hint && "ring-4 ring-mustard",
                  id === "charger" && "col-span-2 aspect-auto",
                )}
              >
                {/* the cut-out in the foam: the piece's shape, dark */}
                <PieceArt piece={{ ...p, colour: "#1B1F2A" }} className={cx("size-16 opacity-80", done && "hidden")} />
                {done && <PieceArt piece={p} className="size-16 animate-pop-in" />}
              </button>
            );
          })}
        </div>
        <span className="absolute -top-3 left-1/2 h-4 w-16 -translate-x-1/2 rounded-t-lg border-[3px] border-b-0 border-ink bg-[#2A2D3A]" aria-hidden="true" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Watch the monitors: the security office's six screens. Ordinary alerts pop up one at a time (a paper jam, the
// rain, a fridge left open); tap the screen to clear each before it times out. Tapping a quiet screen costs nothing.

type Screen = { id: string; title: string; alert: string };

const SCREENS: Screen[] = [
  { id: "cam", title: "LOBBY CAM", alert: "Lens wet" },
  { id: "temp", title: "SERVER TEMP", alert: "Running warm" },
  { id: "weather", title: "WEATHER", alert: "Heavy rain" },
  { id: "print", title: "PRINTERS", alert: "Paper jam" },
  { id: "fridge", title: "KITCHEN", alert: "Fridge open" },
  { id: "lights", title: "LIGHTS", alert: "Bulb out" },
];
const ALERTS = 8;
const GAP_MS = 1300;

function ScreenArt({ id }: { id: string }) {
  if (id === "cam")
    return (
      <svg viewBox="0 0 100 60" className="size-full" aria-hidden="true">
        <path d="M6 8 H94 L80 34 H20 Z" fill="#4A5878" />
        <rect x="30" y="38" width="40" height="10" fill="#56688C" />
        <rect x="78" y="44" width="14" height="10" fill="#7C8AA8" />
      </svg>
    );
  if (id === "temp")
    return (
      <svg viewBox="0 0 100 60" className="size-full" aria-hidden="true">
        <polyline points="4,44 18,40 30,42 44,34 58,38 72,30 86,32 96,26" fill="none" stroke="#7ef0c6" strokeWidth="3" />
        <line x1="4" y1="20" x2="96" y2="20" stroke="#F2B33D" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    );
  if (id === "weather")
    return (
      <svg viewBox="0 0 100 60" className="size-full" aria-hidden="true">
        <circle cx="50" cy="30" r="24" fill="none" stroke="#3FB8AF" strokeWidth="1.5" />
        <circle cx="50" cy="30" r="12" fill="none" stroke="#3FB8AF" strokeWidth="1.5" />
        <path d="M30 18 q12 -8 26 0 q10 6 14 18 q-16 8 -30 2 q-12 -6 -10 -20" fill="#3FB8AF" opacity="0.45" />
      </svg>
    );
  if (id === "print")
    return (
      <svg viewBox="0 0 100 60" className="size-full" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="8" y={10 + i * 15} width="56" height="8" fill="#56688C" />
            <circle cx="80" cy={14 + i * 15} r="4" fill="#3DD68C" />
          </g>
        ))}
      </svg>
    );
  if (id === "fridge")
    return (
      <svg viewBox="0 0 100 60" className="size-full" aria-hidden="true">
        <rect x="36" y="6" width="28" height="48" rx="3" fill="#C9CDD6" />
        <line x1="36" y1="24" x2="64" y2="24" stroke="#56688C" strokeWidth="2" />
        <text x="76" y="36" fontSize="12" fill="#7ef0c6" fontWeight="700">4°</text>
      </svg>
    );
  return (
    <svg viewBox="0 0 100 60" className="size-full" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={14 + i * 18} cy="30" r="6" fill="#F6D36B" opacity={0.85} />
      ))}
    </svg>
  );
}

export function WatchMonitors({ onDone }: GameProps) {
  // Which screen each alert lands on: shuffled once, never the same screen twice in a row.
  const order = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < ALERTS; i++) {
      let s = Math.floor(Math.random() * SCREENS.length);
      if (s === out[i - 1]) s = (s + 1 + Math.floor(Math.random() * (SCREENS.length - 1))) % SCREENS.length;
      out.push(s);
    }
    return out;
  }, []);
  const lasts = reducedMotion() ? 2600 : 1900;
  const [t, setT] = useState(0);
  const [acked, setAcked] = useState<Record<number, boolean>>({});
  const [over, setOver] = useState(false);
  const end = 600 + (ALERTS - 1) * GAP_MS + lasts;
  useLoop(!over, (ms) => {
    setT(ms);
    if (ms > end) {
      setOver(true);
      const hits = Object.keys(acked).length;
      window.setTimeout(() => onDone(hits >= ALERTS - 1 ? 3 : hits >= ALERTS / 2 ? 2 : 1), 600);
    }
  });
  const live = (i: number) => t >= 600 + i * GAP_MS && t < 600 + i * GAP_MS + lasts;
  const showing = (screen: number) => order.findIndex((s, i) => s === screen && live(i) && !acked[i]);
  const missed = (screen: number) => order.some((s, i) => s === screen && !acked[i] && t >= 600 + i * GAP_MS + lasts && t < 600 + i * GAP_MS + lasts + 700);
  const tap = (screen: number) => {
    const i = showing(screen);
    if (i < 0 || over) return;
    setAcked((a) => ({ ...a, [i]: true }));
    play("tap");
    buzz(BUZZ.tap);
  };
  const cleared = Object.keys(acked).length;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-4 pb-14">
      <SecurityScene />
      <p className="relative z-10 rounded-full border-[3px] border-ink bg-cream px-4 py-1 font-display text-ink" aria-live="polite">
        Cleared {cleared} of {ALERTS}
      </p>
      <div className="relative z-10 grid w-[min(24rem,92vw)] grid-cols-2 gap-2 rounded-2xl border-[4px] border-ink bg-[#1B1F2A] p-2.5 shadow-card sm:w-[30rem] sm:grid-cols-3">
        {SCREENS.map((s, i) => {
          const on = showing(i) >= 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => tap(i)}
              aria-label={on ? `${s.title}: ${s.alert}. Clear it` : `${s.title}: all fine`}
              className={cx(
                "relative aspect-[5/3] overflow-hidden rounded-lg border-[3px] border-[#141829] bg-[linear-gradient(#33405E,#1C2438)] p-1 text-left transition-colors",
                on && "border-mustard bg-[linear-gradient(#5A4A2A,#2A2418)]",
                missed(i) && "border-coral",
              )}
            >
              <span className="absolute top-1 left-1.5 font-mono text-[10px] font-bold tracking-wider text-[#9FB2E0]">{s.title}</span>
              <span className="absolute inset-x-1 top-4 bottom-1 opacity-80">
                <ScreenArt id={s.id} />
              </span>
              {on && (
                <span className="absolute inset-x-1 bottom-1 animate-pop-in rounded bg-mustard px-1 text-center font-mono text-[11px] font-bold text-ink">
                  ⚠ {s.alert}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time the barrier: the North Gate's arm swings up and down in the rain. Send each car when the arm is up; one sent
// early bumps the arm softly and waits for it, so every car gets through.

const CARS = ["#D6312F", "#3F6FA0", "#F2B33D", "#3FB8AF"];

function CarArt({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 120 60" className="size-full" aria-hidden="true">
      <path d="M8 44 V30 q2 -6 12 -8 l14 -2 q12 -14 30 -14 h18 q14 2 22 16 q12 2 14 10 v12 Z" fill={colour} stroke="#141829" strokeWidth="3.5" />
      <path d="M38 20 q10 -10 24 -10 h14 q10 2 16 10 Z" fill="#9FB4D6" stroke="#141829" strokeWidth="2.5" />
      <circle cx="32" cy="46" r="9" fill="#14161C" />
      <circle cx="92" cy="46" r="9" fill="#14161C" />
      <rect x="108" y="30" width="6" height="6" fill="#FFF2C0" />
    </svg>
  );
}

export function TimeBarrier({ onDone }: GameProps) {
  const [lift, setLift] = useState(0);
  const [sent, setSent] = useState(0);
  const [clean, setClean] = useState(0);
  const [moving, setMoving] = useState<{ bump: boolean; key: number } | null>(null);
  const done = sent >= CARS.length && !moving;
  useLoop(sent < CARS.length || Boolean(moving), (ms) => setLift(0.5 + 0.5 * Math.sin(ms / (reducedMotion() ? 1100 : 760))));
  const go = () => {
    if (moving || sent >= CARS.length) return;
    const ok = lift > 0.6;
    setMoving({ bump: !ok, key: Date.now() });
    play(ok ? "tap" : "tick");
    buzz(BUZZ.tap);
    const total = clean + (ok ? 1 : 0);
    if (ok) setClean(total);
    window.setTimeout(
      () => {
        setMoving(null);
        const n = sent + 1;
        setSent(n);
        if (n === CARS.length) {
          play("found");
          window.setTimeout(() => onDone(total >= 4 ? 3 : total >= 2 ? 2 : 1), 700);
        }
      },
      ok ? 900 : 1500,
    );
  };
  const front = Math.min(sent, CARS.length - 1);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-5 pb-14">
      <CarParkScene />
      <div className="relative z-10 h-48 w-[min(24rem,92vw)] sm:w-[30rem]" aria-live="polite">
        {/* the arm on its post, hinged at the right */}
        <span className="absolute right-6 bottom-0 h-24 w-5 rounded-t-md border-[3px] border-ink bg-[repeating-linear-gradient(#F2B33D_0_14px,#1B1F2A_14px_22px)]" aria-hidden="true" />
        <span
          className="absolute right-8 bottom-20 h-3.5 w-[62%] origin-right rounded-full border-[3px] border-ink bg-[repeating-linear-gradient(90deg,#F2EFE6_0_18px,#D6312F_18px_36px)]"
          style={{ transform: `rotate(${lift * 78}deg)` }}
          aria-hidden="true"
        />
        <span className={cx("absolute top-0 right-0 rounded-full border-[3px] border-ink px-3 py-0.5 font-display text-sm", lift > 0.6 ? "bg-[#5fd38a]" : "bg-coral text-cream")}>
          {lift > 0.6 ? "UP" : "DOWN"}
        </span>
        {/* the queue, and the car going through */}
        {CARS.map((colour, i) => {
          if (i < sent) return null;
          const isMoving = i === front && moving;
          const place = i - sent;
          return (
            <span
              key={i}
              className={cx("absolute bottom-0 h-14 w-28", isMoving && (moving!.bump ? "world-car-bump" : "world-car-go"))}
              style={{ left: `${Math.max(-40, 34 - place * 30)}%` }}
            >
              <CarArt colour={colour} />
            </span>
          );
        })}
        {done && <p className="absolute inset-x-0 top-6 text-center font-display text-2xl text-cream">All through: {clean} clean</p>}
      </div>
      <button type="button" onClick={go} disabled={Boolean(moving) || sent >= CARS.length} className={cx(big, "relative z-10 grid size-24 place-items-center text-2xl")}>
        Go
      </button>
    </div>
  );
}
