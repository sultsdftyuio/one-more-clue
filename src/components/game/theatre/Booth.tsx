"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import type { PlayerView } from "@/lib/game/engine";
import type { Act } from "../context";
import { AudioToggles } from "../audio/AudioToggles";
import { VoiceControl } from "../live/VoiceControl";
import { Icon } from "../ui/Icon";
import { SeatRow, Trailer, useCheerBursts } from "./parts";

const SCREENS = [
  { mode: "together", label: "One screen", note: "Same room. The film and music play on your phone, so nothing echoes." },
  { mode: "remote", label: "Every phone", note: "Apart. Everyone watches on their own phone, with voice chat." },
] as const;

const TRAVEL = 96;

/**
 * The start control: a lever you pull down. Half a pull springs back, so nobody rolls
 * the film by brushing the screen. Keyboards pull it with the arrow keys or Enter.
 */
function Lever({ enabled, needed, onRoll }: { enabled: boolean; needed: number; onRoll: () => Promise<boolean> }) {
  const [y, setY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rolling, setRolling] = useState(false);
  const drag = useRef<{ startY: number; base: number } | null>(null);
  const progress = y / TRAVEL;

  const roll = async () => {
    setY(TRAVEL);
    setRolling(true);
    if (!(await onRoll())) {
      setRolling(false);
      setY(0);
    }
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || rolling) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, base: y };
    setDragging(true);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setY(Math.min(TRAVEL, Math.max(0, drag.current.base + e.clientY - drag.current.startY)));
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (y / TRAVEL > 0.8) void roll();
    else setY(0);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled || rolling) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void roll();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(TRAVEL, y + TRAVEL / 4);
      if (next >= TRAVEL) void roll();
      else setY(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setY(Math.max(0, y - TRAVEL / 4));
    }
  };

  return (
    <>
      {/* The house lights go down as the lever does. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-10 bg-black" style={{ opacity: progress * 0.5 }} />
      <div className="booth-plate fixed inset-x-0 bottom-0 z-20 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl items-center gap-5 px-5 py-4">
          <div className="relative h-[9.5rem] w-14 shrink-0">
            <div className="absolute inset-x-3 top-2 bottom-2 rounded-full bg-black/70 shadow-[inset_0_3px_8px_rgb(0_0_0_/_0.8)]" />
            <div
              role="slider"
              tabIndex={enabled ? 0 : -1}
              aria-label="Pull down to roll the film and start the case"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-disabled={!enabled}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onKeyDown={key}
              className={cx(
                "absolute top-0 left-0 size-14 touch-none rounded-full border-[3px] border-ink bg-mustard shadow-pop-sm outline-offset-4",
                enabled ? "cursor-grab active:cursor-grabbing" : "opacity-40 grayscale",
                !dragging && "transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.6,1)]",
              )}
              style={{ transform: `translateY(${y}px)` }}
            >
              <Icon name="arrow" className="absolute inset-0 m-auto size-6 rotate-90 text-ink" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-tight">{rolling ? "Rolling…" : enabled ? "Pull down to start" : `Need ${needed} more`}</p>
            <p className="mt-1 text-sm leading-snug font-bold text-cream/70">
              {enabled ? "The lights dim and the film starts on every phone." : `Invite ${needed === 1 ? "one more friend" : `${needed} more friends`} to start.`}
            </p>
            <div className="mt-2.5 flex items-center gap-2" aria-hidden>
              <span className="text-xs font-bold text-cream/50">Lights</span>
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-3.5 rounded-full bg-moon shadow-[0_0_10px_var(--color-moon)]" style={{ opacity: 1 - progress * 0.88 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The host's lobby: they run the projection booth. A window over their audience with the
 * trailer on the screen, the reel on the projector, invites, the screen setting, and
 * the lever that rolls the film.
 */
export function Booth({
  view,
  act,
  busy,
  onShare,
  onCopy,
  copied,
  onStart,
  nameSlot,
}: {
  view: PlayerView;
  act: Act;
  busy: boolean;
  onShare: () => void;
  onCopy: () => void;
  copied: boolean;
  onStart: () => Promise<boolean>;
  nameSlot: React.ReactNode;
}) {
  const { bursts } = useCheerBursts(view);
  const count = view.players.length;
  const needed = Math.max(0, view.case.minPlayers - count);
  const guests = view.players.filter((p) => !p.isHost);
  const screen = SCREENS.find((s) => s.mode === view.mode)!;

  return (
    <div className="booth-steel min-h-[100svh]">
      <div className="mx-auto grid max-w-xl gap-5 px-4 pt-4 pb-60">
        <header className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[0.2em] text-cream/55 uppercase">Projection booth</p>
            <h1 className="truncate font-display text-2xl">{view.case.title}</h1>
          </div>
          <p className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold">Room {view.code}</p>
        </header>

        <section aria-label="Your audience" className="-mt-1 overflow-hidden rounded-2xl border-8 border-[#252b33] bg-black">
          <div className="relative mx-auto mt-3 aspect-video w-[78%] overflow-hidden rounded-md">
            <Trailer view={view} />
          </div>
          <div className="px-4 pt-9 pb-3">
            <SeatRow view={view} bursts={bursts} compact onSeat={() => onShare()} />
            <p className="mt-3 text-center text-xs font-bold text-cream/55">
              Your audience · {count} of {view.case.maxPlayers}
            </p>
          </div>
        </section>

        {guests.length > 0 && (
          <ul className="-mt-1 flex flex-wrap gap-2" aria-label="Detectives in their seats">
            {guests.map((p) => (
              <li key={p.id} className="flex items-center gap-1 rounded-full bg-white/8 py-1 pr-1 pl-3 text-sm font-bold">
                {p.name}
                <button
                  type="button"
                  onClick={() => act({ type: "kick", playerId: p.id })}
                  aria-label={`Remove ${p.name}`}
                  className="grid size-8 place-items-center rounded-full text-cream/60 hover:bg-white/10 hover:text-cream"
                >
                  <Icon name="x" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <section aria-label="Invite friends">
          <h2 className="font-display text-xl">Invite friends</h2>
          <p className="mt-0.5 text-sm font-bold text-cream/65">
            Send them the link, or they can type <span className="font-extrabold text-cream">{view.code}</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onShare} className={buttonClass("primary", "px-5 py-2.5 text-base")}>
              <Icon name="share" className="size-4" /> Send the link
            </button>
            <button type="button" onClick={onCopy} className={buttonClass("secondary", "px-5 py-2.5 text-base")}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </section>

        <section aria-label="The screen">
          <h2 className="font-display text-xl">Where&apos;s the screen?</h2>
          <div role="radiogroup" aria-label="Where's the screen?" className="mt-2 grid grid-cols-2 gap-2">
            {SCREENS.map((s) => {
              const on = view.mode === s.mode;
              return (
                <button
                  key={s.mode}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => !on && act({ type: "setMode", mode: s.mode })}
                  className={cx(
                    "flex min-h-[48px] items-center gap-2 rounded-xl border-2 px-3 text-left font-extrabold disabled:opacity-60",
                    on ? "border-mustard bg-mustard/10 text-cream" : "border-white/10 text-cream/70 hover:border-white/25",
                  )}
                >
                  <span className={cx("size-3 shrink-0 rounded-full", on ? "bg-mustard" : "bg-white/20")} />
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm font-bold text-cream/60">{screen.note}</p>
        </section>

        <section aria-label="Sound" className="flex flex-wrap items-center gap-3">
          <AudioToggles className="min-w-56 flex-1" />
          <VoiceControl compact />
        </section>

        <section aria-label="The projector" className="flex items-center gap-4 rounded-2xl bg-white/5 p-4">
          <div className="relative h-16 w-24 shrink-0" aria-hidden>
            <span className="film-reel reel-spin absolute top-0 left-0 size-12 rounded-full border-[3px] border-[#8b949e]" />
            <span className="film-reel reel-spin absolute top-0 right-0 size-12 rounded-full border-[3px] border-[#8b949e] [animation-delay:-1.3s]" />
            <span className="booth-plate absolute inset-x-1 bottom-0 h-7 rounded-lg border border-white/10" />
          </div>
          <div className="min-w-0 text-sm font-bold text-cream/70">
            <p>You&apos;re running the projector tonight. The film is loaded.</p>
            <p className="mt-1 text-xs text-cream/55">{nameSlot}</p>
          </div>
        </section>

        {count === 1 && (
          <p className="text-sm font-bold text-cream/70">
            You need at least one friend to start. While you wait,{" "}
            <a href="/#mini-case" target="_blank" rel="noopener" className="text-mustard underline decoration-2 underline-offset-4 hover:text-cream">
              try the 30-second warm-up
            </a>
            .
          </p>
        )}

        {view.testBots && count < view.case.maxPlayers && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-white/15 p-3">
            <Button variant="secondary" className="px-4 py-2 text-base" disabled={busy} onClick={() => act({ type: "addBot" })}>
              <Icon name="robot" className="size-4" /> Add a test bot
            </Button>
            <p className="flex-1 text-sm font-bold text-cream/55">Test builds only.</p>
          </div>
        )}

        <button type="button" onClick={() => act({ type: "leave" })} className="justify-self-center py-2 text-sm font-extrabold text-cream/55 hover:text-cream">
          Leave
        </button>
      </div>

      <Lever enabled={needed === 0 && !busy} needed={needed} onRoll={onStart} />
    </div>
  );
}
