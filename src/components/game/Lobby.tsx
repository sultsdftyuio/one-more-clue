"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PlayerView } from "@/lib/game/engine";
import type { Action, Mode } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { Panel, PlayerRow } from "./parts";

const MODES: { mode: Mode; title: string; text: string }[] = [
  { mode: "together", title: "Same room", text: "You're together. Read evidence out loud and show each other your screens." },
  { mode: "remote", title: "Remote", text: "You're apart, on a call or not. Adds a chat to the room." },
];

export function ModePicker({ value, onChange, disabled }: { value: Mode; onChange?: (mode: Mode) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Where are you playing?">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          role="radio"
          aria-checked={value === m.mode}
          disabled={disabled}
          onClick={() => onChange?.(m.mode)}
          className={cx(
            "rounded-2xl border-[3px] border-ink p-3 text-left text-ink transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-default",
            value === m.mode ? "bg-mustard shadow-pop-sm" : "bg-cream/70",
          )}
        >
          <span className="font-display text-lg">{m.title}</span>
          <span className="mt-1 block text-sm leading-snug font-semibold text-ink/75">{m.text}</span>
        </button>
      ))}
    </div>
  );
}

export function Lobby({ view, act, busy }: { view: PlayerView; act: (a: Action) => Promise<boolean>; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  const isHost = view.me.isHost;
  const count = view.players.length;
  const enough = count >= view.case.minPlayers;

  const share = async () => {
    const url = `${window.location.origin}/r/${view.code}`;
    const text = `Join my One More Clue case: ${view.case.title}`;
    if (navigator.share) {
      await navigator.share({ title: "One More Clue", text, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6">
      <Panel>
        <p className="text-sm font-extrabold tracking-widest text-mustard uppercase">{view.case.code}</p>
        <h1 className="font-display text-4xl text-cream sm:text-5xl">{view.case.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm font-bold text-cream/70">Room code</p>
            <p className="font-display text-5xl tracking-[0.2em] text-mustard">{view.code}</p>
          </div>
          <Button variant="secondary" onClick={share}>
            {copied ? "Link copied!" : "Invite friends"}
          </Button>
        </div>
      </Panel>

      <Panel title={`Detectives (${count}/${view.case.maxPlayers})`}>
        <ul className="grid gap-2">
          {view.players.map((p) => (
            <PlayerRow key={p.id} player={p}>
              {isHost && p.id !== view.me.id && (
                <button
                  type="button"
                  onClick={() => act({ type: "kick", playerId: p.id })}
                  className="text-sm font-extrabold text-coral-dk hover:underline"
                >
                  Remove
                </button>
              )}
            </PlayerRow>
          ))}
        </ul>
        {!enough && (
          <p className="mt-4 font-bold text-cream/75">
            Waiting for at least {view.case.minPlayers} players. Send them the link or the code.
          </p>
        )}
      </Panel>

      <Panel title="Where are you playing?">
        <ModePicker value={view.mode} disabled={!isHost} onChange={(mode) => act({ type: "setMode", mode })} />
        {!isHost && <p className="mt-3 text-sm font-bold text-cream/60">The host picks this.</p>}
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={() => act({ type: "leave" })} className="font-extrabold text-cream/70 hover:text-coral">
          Leave room
        </button>
        {isHost ? (
          <Button onClick={() => act({ type: "start" })} disabled={!enough || busy}>
            Start the case
          </Button>
        ) : (
          <p className="font-bold text-cream/80">Waiting for the host to start…</p>
        )}
      </div>
    </div>
  );
}
