"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/game/engine";
import type { CheerKind } from "@/lib/game/types";
import type { Act } from "../context";
import { AudioToggles } from "../audio/AudioToggles";
import { play } from "../audio/sound";
import { VoiceControl } from "../live/VoiceControl";
import { Icon } from "../ui/Icon";
import { CastCards, HowTonight, SeatRow, Trailer, useCheerBursts } from "./parts";

/** How a night plays, in the landing page's words, adjusted for where the film plays. */
export function nightSteps(view: PlayerView, host: string) {
  const opening = !view.case.cinematic
    ? "The story of the night, on every phone."
    : view.mode === "together"
      ? `A short film, on ${host}'s phone.`
      : "A short film, on every phone.";
  return [
    { title: "Watch it open", text: opening },
    { title: "Work your role", text: "Your phone becomes your tool." },
    { title: "Show your proof", text: "Pin it and vote on it together." },
    { title: "Catch the lie", text: "Break their story with proof." },
  ];
}

const CHEERS: { kind: CheerKind; label: string }[] = [
  { kind: "popcorn", label: "Popcorn" },
  { kind: "shh", label: "Shh!" },
  { kind: "ooh", label: "Ooh!" },
];

/**
 * A friend's lobby: they're in the audience. The case's trailer plays on the screen,
 * they pick a seat and throw popcorn while the host gets ready to roll the film.
 */
export function Audience({ view, act, onShare, nameSlot }: { view: PlayerView; act: Act; onShare: () => void; nameSlot: React.ReactNode }) {
  const host = view.players.find((p) => p.isHost)?.name ?? "the host";
  const { bursts, mine } = useCheerBursts(view);
  const [cooling, setCooling] = useState(false);
  const together = view.mode === "together";
  const open = view.players.length < view.case.maxPlayers;

  const cheer = (kind: CheerKind) => {
    if (cooling) return;
    setCooling(true);
    window.setTimeout(() => setCooling(false), 800);
    play("tap");
    mine(kind);
    void act({ type: "cheer", kind });
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-4 pb-24 lg:max-w-6xl lg:px-8 lg:pt-8">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-[0.2em] text-cream/55 uppercase">{view.case.code}</p>
          <h1 className="truncate font-display text-2xl">{view.case.title}</h1>
        </div>
        <p className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold">Room {view.code}</p>
      </header>

      {/* One column on a phone; on a laptop the screen sits left and the seats right. */}
      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-12">
      <div className="grid content-start gap-6">
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Trailer view={view} />
        <span className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-extrabold text-cream/90">Trailer</span>
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-black/80 px-3 pt-6 pb-2 text-center text-sm font-extrabold">
          The film starts when {host} rolls it
        </p>
      </div>

      <HowTonight steps={nightSteps(view, host)} />
      </div>

      <div className="grid content-start gap-6">
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl">Pick your seat</h2>
          <p className="text-xs font-extrabold text-cream/60">
            {view.players.length} of {view.case.maxPlayers} here
          </p>
        </div>
        <div className="mt-8">
          <SeatRow view={view} bursts={bursts} onSeat={(seat) => void act({ type: "sit", seat })} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-cream/70">
          {nameSlot}
          {open && (
            <button type="button" onClick={onShare} className="inline-flex min-h-[44px] items-center gap-1.5 font-extrabold text-mustard hover:text-cream">
              <Icon name="share" className="size-4" /> Invite a friend
            </button>
          )}
        </div>
      </section>

      <section aria-label="While you wait" className="flex items-center gap-2">
        <span className="mr-1 text-sm font-extrabold text-cream/60">While you wait</span>
        {CHEERS.map((c) => (
          <button
            key={c.kind}
            type="button"
            onClick={() => cheer(c.kind)}
            className="min-h-[44px] flex-1 rounded-full bg-white/8 px-2 text-sm font-extrabold text-cream transition-transform hover:bg-white/12 active:scale-95"
          >
            {c.label}
          </button>
        ))}
      </section>

      <section className="grid gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-cream/75">
          <Icon name="speaker" className="size-4 shrink-0" />
          {together ? `Same room: the film and music play on ${host}'s phone.` : "Apart: the film plays on every phone."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <AudioToggles className="min-w-56 flex-1" />
          {!together && <VoiceControl compact />}
        </div>
      </section>

      <CastCards view={view} />
      </div>
      </div>
    </div>
  );
}
