"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { posterArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import type { PlayerView, PublicPlayer } from "@/lib/game/engine";
import type { CheerKind } from "@/lib/game/types";
import { Avatar } from "../parts";
import { Icon, type IconName } from "../ui/Icon";

/**
 * The case's film as its trailer: muted, looping, on the cinema screen. It's the same
 * file the opening plays, so by curtain-up it's already loaded. Until it plays (or
 * for a case with no film) the poster shows. Fills its parent, which sets the size.
 */
export function Trailer({ view }: { view: PlayerView }) {
  const film = view.case.cinematic;
  const ref = useRef<HTMLVideoElement>(null);
  const poster = posterArt[view.case.id];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // iPhones only autoplay a video that is muted before it plays; React doesn't set the attribute.
    el.muted = true;
    el.defaultMuted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.play().catch(() => undefined);
  }, [film?.video]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {poster ? (
        <Image src={poster} alt="" fill sizes="(min-width: 640px) 560px, 100vw" className="object-cover object-[50%_30%] opacity-80" />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <p className="font-display text-2xl text-cream">{view.case.title}</p>
        </div>
      )}
      {film && (
        <video ref={ref} src={film.video} poster={poster?.src} muted loop playsInline preload="metadata" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[50%_42%]" />
      )}
    </div>
  );
}

/** How a night plays, in four short steps. Same words as the landing page. */
export function HowTonight({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <section aria-label="How tonight works">
      <h2 className="font-display text-xl">How tonight works</h2>
      <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-extrabold">{i + 1}</span>
            <span className="min-w-0 text-sm leading-snug">
              <span className="block font-extrabold">{s.title}</span>
              <span className="block font-semibold text-cream/65">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export type Burst = { id: string; by: string; kind: CheerKind };

/**
 * Reactions to play over the seats. Everyone else's arrive with the room; your own
 * play the moment you tap. Ones already in the room when you arrived stay quiet.
 */
export function useCheerBursts(view: PlayerView) {
  const seen = useRef<Set<string> | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const add = (list: Burst[]) => {
    setBursts((b) => [...b, ...list]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => !list.some((l) => l.id === x.id))), 2000);
  };

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(view.cheers.map((c) => c.id));
      return;
    }
    const known = seen.current;
    const fresh = view.cheers.filter((c) => !known.has(c.id));
    fresh.forEach((c) => known.add(c.id));
    const theirs = fresh.filter((c) => c.by !== view.me.id).map(({ id, by, kind }) => ({ id, by, kind }));
    if (theirs.length) add(theirs);
  }, [view.cheers, view.me.id]);

  return { bursts, mine: (kind: CheerKind) => add([{ id: `mine-${Date.now()}`, by: view.me.id, kind }]) };
}

const KERNELS = [
  { dx: "-22px", spin: "160deg", left: "40%", delay: "0s" },
  { dx: "16px", spin: "-120deg", left: "52%", delay: "0.08s" },
  { dx: "-6px", spin: "90deg", left: "46%", delay: "0.16s" },
  { dx: "26px", spin: "200deg", left: "56%", delay: "0.24s" },
  { dx: "-30px", spin: "-60deg", left: "38%", delay: "0.3s" },
];

function BurstFx({ kind }: { kind: CheerKind }) {
  if (kind === "popcorn") {
    return (
      <>
        {KERNELS.map((k, i) => (
          <span
            key={i}
            className="kernel absolute top-2 h-2 w-2.5 rounded-full bg-moon"
            style={{ left: k.left, animationDelay: k.delay, "--dx": k.dx, "--spin": k.spin } as CSSProperties}
          />
        ))}
      </>
    );
  }
  return (
    <span className="cheer-bubble absolute -top-9 left-1/2 rounded-[12px_12px_12px_3px] bg-cream px-2.5 py-0.5 text-sm font-extrabold whitespace-nowrap text-ink">
      {kind === "shh" ? "Shh!" : "Ooh!"}
    </span>
  );
}

/**
 * One row of seats, one per player the case allows. Your seat glows; a free seat can be
 * tapped (a friend moves there, the host sends its ticket).
 */
export function SeatRow({
  view,
  bursts,
  onSeat,
  compact,
}: {
  view: PlayerView;
  bursts: Burst[];
  onSeat?: (seat: number) => void;
  compact?: boolean;
}) {
  const seats = Array.from({ length: view.case.maxPlayers }, (_, s) => view.players.find((p) => p.seat === s) ?? null);
  const indexOf = (p: PublicPlayer) => view.players.findIndex((x) => x.id === p.id);
  const seatBack = cx("velvet-seat w-full rounded-t-[22px] rounded-b-lg", compact ? "h-9" : "h-16");

  return (
    <ul className="flex items-end justify-between gap-2">
      {seats.map((p, s) => {
        if (!p) {
          return (
            <li key={s} className="flex flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => onSeat?.(s)}
                disabled={!onSeat}
                aria-label={`Seat ${s + 1} is free`}
                className="flex w-full flex-col items-center disabled:cursor-default"
              >
                <span className={cx(seatBack, "opacity-35")} />
                <span className="mt-1.5 text-xs font-bold text-cream/45">Free</span>
              </button>
            </li>
          );
        }
        const mine = p.id === view.me.id;
        return (
          <li key={s} className="relative flex min-w-0 flex-1 flex-col items-center">
            {bursts
              .filter((b) => b.by === p.id)
              .map((b) => (
                <BurstFx key={b.id} kind={b.kind} />
              ))}
            <span className={cx("relative z-[1] -mb-3 rounded-full", mine && !p.isHost && "my-seat")}>
              <Avatar name={p.name} index={indexOf(p)} online={p.online} size={compact ? "sm" : "md"} />
            </span>
            <span className={seatBack} />
            <span className="mt-1.5 max-w-full truncate text-xs font-extrabold text-cream/85">
              {mine ? "You" : p.name}
              {p.isHost && <span className="font-bold text-cream/50"> · host</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const ROLE_ICON: Record<string, IconName> = { inspect: "camera", interview: "mic", crosscheck: "pin", search: "search", none: "file" };

/** Tonight's cast: the case's roles, face down until curtain-up. */
export function CastCards({ view }: { view: PlayerView }) {
  const roles = view.case.roles.filter((r) => r.core);
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Tonight&apos;s roles</h2>
        <p className="text-xs font-bold text-cream/55">dealt when the film starts</p>
      </div>
      <ul className="mt-2 grid grid-cols-4 gap-2">
        {roles.map((r) => (
          <li key={r.id} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 px-1 py-3">
            <Icon name={ROLE_ICON[r.ability] ?? "file"} className="size-6 text-cream/75" />
            <span className="max-w-full truncate text-[0.7rem] font-extrabold text-cream/85">{r.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
