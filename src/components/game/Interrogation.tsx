"use client";

import { useEffect, useRef, useState } from "react";
import { OBJECTION_MS, type PlayerView } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { play } from "./audio/sound";
import { evidenceIn, nameOf, useGame } from "./context";
import { SuspectPortrait } from "./parts";
import { Icon } from "./ui/Icon";

type Room = NonNullable<PlayerView["interrogation"]>;

function Strikes({ room }: { room: Room }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${room.strikesAllowed - room.strikes} of ${room.strikesAllowed} strikes left`}>
      {Array.from({ length: room.strikesAllowed }, (_, i) => (
        <span key={i} className={cx("grid size-6 place-items-center rounded-full border-2 border-ink", i < room.strikes ? "bg-coral text-cream" : "bg-cream/90 text-ink/25")}>
          <Icon name="x" className="size-3.5" />
        </span>
      ))}
    </span>
  );
}

/** What the suspect is saying right now: the words for the lead, a closed mouth for everyone else. */
function Claim({ room }: { room: Room }) {
  const { act, busy } = useGame();
  const counter = `Claim ${room.index + 1} of ${room.total}`;
  return (
    <div className="flex-1">
      <div className="relative rounded-3xl rounded-bl-md border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-card">
        <p className="text-xs font-extrabold tracking-wide text-ink/50 uppercase">{counter}</p>
        {room.claim ? (
          <p className={cx("text-lg leading-snug font-bold", room.currentBroken && "text-ink/45 line-through decoration-coral decoration-[3px]")}>
            &ldquo;{room.claim}&rdquo;
          </p>
        ) : (
          <p className="font-bold text-ink/70">Only the Interviewer can hear this. Ask them to read it out, word for word.</p>
        )}
        {room.currentBroken && (
          <span className="absolute -top-3 -right-2 rotate-12 rounded-lg border-[3px] border-coral bg-cream px-2 font-display text-lg text-coral">LIE</span>
        )}
      </div>
      {room.leads && !room.over && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy || Boolean(room.call)}
            onClick={() => act({ type: "press", step: -1 }, { quiet: true })}
            className="grid size-11 place-items-center rounded-2xl border-[3px] border-ink bg-cream text-ink shadow-pop-sm disabled:opacity-50"
            aria-label="Back to the last claim"
          >
            <Icon name="back" className="size-4" />
          </button>
          <button
            type="button"
            disabled={busy || Boolean(room.call)}
            onClick={() => act({ type: "press", step: 1 }, { quiet: true })}
            className="flex-1 rounded-2xl border-[3px] border-ink bg-lilac py-2 font-display text-lg text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            Press on <Icon name="arrow" className="ml-1 inline size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A called lie hangs in the air for a few seconds so the team can stop it. It sits
 * over every tab, because anyone might be on the board. Each phone counts down and
 * asks the room to land it; the room checks the time and the first ask wins.
 */
export function LieCallBar() {
  const { view, act } = useGame();
  const call = view.interrogation?.call;
  const callId = call?.id;

  useEffect(() => {
    if (!callId) return;
    play("vote");
    const land = () => act({ type: "settleLie", callId }, { quiet: true });
    let retry = 0;
    const first = window.setTimeout(() => {
      land();
      retry = window.setInterval(land, 2000);
    }, OBJECTION_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(retry);
    };
  }, [act, callId]);

  if (!call) return null;
  const mine = call.by === view.me.id;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-40 p-3 lg:bottom-0 lg:p-5" role="alert">
      <div className="mx-auto max-w-2xl animate-[sheet-up_0.25s_ease-out] overflow-hidden rounded-3xl border-[3px] border-ink bg-coral text-cream shadow-card">
        <div className="p-4">
          <p className="font-display text-xl leading-tight">
            {nameOf(view, call.by)} {mine ? "are" : "is"} calling it a lie
          </p>
          <p className="mt-0.5 font-bold">Presenting: {call.title}</p>
          <button
            type="button"
            onClick={() => act({ type: "object", callId: call.id }, { quiet: true })}
            className="mt-3 w-full rounded-2xl border-[3px] border-ink bg-cream py-2.5 font-display text-xl text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {mine ? "Take it back" : "Objection!"}
          </button>
        </div>
        <div className="h-2.5 bg-ink/40" aria-hidden>
          <div key={call.id} className="h-full origin-left bg-mustard" style={{ animation: `drain ${OBJECTION_MS}ms linear both` }} />
        </div>
      </div>
    </div>
  );
}

/** Pick something from the board and throw it at the current claim. */
function CallLie({ room, name }: { room: Room; name: string }) {
  const { view, act, busy } = useGame();
  const [picked, setPicked] = useState<string | null>(null);
  const pinned = view.pins.flatMap((p) => {
    const e = evidenceIn(view, p.evidenceId);
    return e ? [e] : [];
  });

  if (room.currentBroken) return <p className="mt-4 text-sm font-bold text-cream/70">Caught. Press on to the next claim.</p>;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-extrabold tracking-widest text-mustard uppercase">Call it a lie with something on the board</p>
      {pinned.length ? (
        <ul className="flex flex-wrap gap-2">
          {pinned.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setPicked((p) => (p === e.id ? null : e.id))}
                aria-pressed={picked === e.id}
                className={cx(
                  "rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors",
                  picked === e.id ? "border-ink bg-mustard text-ink" : "border-cream/25 bg-night/40 text-cream hover:border-cream/70",
                )}
              >
                {e.title}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-bold text-cream/60">The board is empty. Pin what could break the story first.</p>
      )}
      <button
        type="button"
        disabled={!picked || busy || Boolean(room.call)}
        onClick={async () => {
          if (picked && (await act({ type: "callLie", evidenceId: picked }))) setPicked(null);
        }}
        className="mt-3 w-full rounded-2xl border-[3px] border-ink bg-coral py-3 font-display text-2xl tracking-wide text-cream shadow-pop transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-pop-sm disabled:opacity-50"
      >
        That&apos;s a lie!
      </button>
      <p className="mt-2 text-center text-xs font-bold text-cream/55">
        Your team gets 5 seconds to object. A wrong call is a strike, and after {room.strikesAllowed} strikes {name} walks out.
      </p>
    </div>
  );
}

/** The confrontation: the person the team named, their story claim by claim, and the lies caught one at a time. */
export function InterrogationPanel() {
  const { view } = useGame();
  const room = view.interrogation;
  if (!room) return null;
  const suspect = view.case.suspects.find((s) => s.id === room.suspect)!;
  const name = suspect.name.split(" ")[0];

  return (
    <section className="overflow-hidden rounded-3xl border-[3px] border-ink bg-[radial-gradient(circle_at_50%_0%,rgba(255,236,170,0.18),transparent_60%)] bg-night p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold tracking-widest text-mustard uppercase">The confrontation</p>
          <h3 className="font-case text-2xl leading-tight text-[var(--case-accent)]">{suspect.name}</h3>
        </div>
        <Strikes room={room} />
      </div>

      {room.broken.length === 0 && room.strikes === 0 && (
        <p className="mb-4 rounded-2xl border-2 border-dashed border-cream/25 p-3 text-sm font-semibold text-cream/80">
          {name} tells the story one claim at a time, and only the Interviewer hears it. Some of it is true. When a claim doesn&apos;t fit, anyone can
          call the lie with evidence from the board. Catch every lie and {name} confesses.
        </p>
      )}

      <div className="flex items-end gap-3">
        <SuspectPortrait suspect={suspect} shocked={room.currentBroken} className="w-20 shrink-0 sm:w-24" />
        <Claim room={room} />
      </div>
      <CallLie room={room} name={name} />

      {room.broken.length > 0 && (
        <ol className="mt-5 grid gap-2 border-t-2 border-cream/10 pt-4">
          {room.broken.map((b) => (
            <li key={b.id} className="rounded-2xl border-2 border-coral/50 bg-coral/10 p-3">
              <p className="text-sm font-bold text-cream/50 line-through decoration-coral decoration-2">&ldquo;{b.text}&rdquo;</p>
              <p className="mt-1 font-bold text-cream">&ldquo;{b.crack}&rdquo;</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** A full-screen "LIE" stamp for the whole team whenever someone breaks a claim. */
export function LieMoment() {
  const { view } = useGame();
  const seen = useRef<string | null>(null);
  const [shown, setShown] = useState<{ id: string; by?: string } | null>(null);

  useEffect(() => {
    const lies = view.activity.filter((a) => a.kind === "lie");
    const last = lies.at(-1);
    if (seen.current === null) {
      seen.current = last?.id ?? "";
      return;
    }
    if (!last || last.id === seen.current) return;
    seen.current = last.id;
    setShown({ id: last.id, by: last.playerId });
    play("stamp");
    const timer = window.setTimeout(() => setShown(null), 4200);
    return () => window.clearTimeout(timer);
  }, [view.activity]);

  const room = view.interrogation;
  const crack = room?.broken.at(-1);
  if (!shown || !room || !crack) return null;
  const suspect = view.case.suspects.find((s) => s.id === room.suspect)!;
  return (
    <div className="fixed inset-0 z-[53] grid animate-[fade-in_0.2s_ease-out] place-items-center bg-night/85 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label="Lie caught">
      <button type="button" aria-label="Close" onClick={() => setShown(null)} className="absolute inset-0" />
      <div className="relative w-full max-w-md text-center">
        <p className="inline-block -rotate-12 animate-stamp rounded-2xl border-[6px] border-coral px-8 py-1 font-display text-7xl text-coral">LIE!</p>
        <p className="mt-7 text-sm font-extrabold tracking-widest text-mustard uppercase">{nameOf(view, shown.by)} caught it</p>
        <div className="mt-4 flex animate-shake items-end gap-3 text-left">
          <SuspectPortrait suspect={suspect} shocked className="w-24 shrink-0" />
          <div className="mb-4 flex-1 rounded-3xl rounded-bl-md border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-card">
            <p className="text-sm font-bold text-ink/45 line-through decoration-coral decoration-2">&ldquo;{crack.text}&rdquo;</p>
            <p className="mt-1 text-lg leading-snug font-bold">&ldquo;{crack.crack}&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}
