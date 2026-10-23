"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import type { PlayerView } from "@/lib/game/engine";
import type { Mode } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import type { Act } from "./context";
import { useLiveRoom } from "./live/useLive";
import { VoiceControl } from "./live/VoiceControl";
import { Panel, PlayerRow, SuspectPortrait } from "./parts";
import { Icon } from "./ui/Icon";

const MODES: { mode: Mode; title: string; text: string; icon: "users" | "chat" }[] = [
  { mode: "together", title: "Same room", text: "You're together. Read evidence out loud and show each other your screens.", icon: "users" },
  { mode: "remote", title: "Remote", text: "You're apart, on a call or not. Adds a team chat.", icon: "chat" },
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
            "flex gap-3 rounded-2xl border-[3px] border-ink p-3 text-left text-ink transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-default",
            value === m.mode ? "bg-mustard shadow-pop-sm" : "bg-cream/60",
          )}
        >
          <Icon name={m.icon} className="mt-0.5" />
          <span>
            <span className="font-display text-lg">{m.title}</span>
            <span className="mt-0.5 block text-sm leading-snug font-semibold text-ink/75">{m.text}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function CaseCover({ view }: { view: PlayerView }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border-[3px] border-ink bg-[radial-gradient(circle_at_80%_0%,#3a3f78,#1b1f3b_60%)] p-5 shadow-card sm:p-7">
      <p className="text-xs font-extrabold tracking-[0.25em] text-mustard uppercase">{view.case.code}</p>
      <h1 className="mt-1 font-display text-4xl leading-[0.95] text-cream text-pop sm:text-5xl">{view.case.title}</h1>
      <p className="mt-3 max-w-md text-lg font-bold text-cream/80">{view.case.tagline}</p>
      <ul className="mt-4 flex flex-wrap gap-2 text-sm font-extrabold">
        {[`${view.case.minPlayers}–${view.case.maxPlayers} players`, `${view.case.chapterTitles.length} chapters`, "15–25 min"].map((t) => (
          <li key={t} className="rounded-full border-2 border-cream/25 px-3 py-0.5 text-cream">
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-end justify-center gap-1 sm:justify-start">
        {view.case.suspects.map((s) => (
          <SuspectPortrait key={s.id} suspect={s} className="w-16 animate-bob sm:w-20" />
        ))}
      </div>
    </section>
  );
}

export function Lobby({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  const { speaking } = useLiveRoom();
  const isHost = view.me.isHost;
  const count = view.players.length;
  const enough = count >= view.case.minPlayers;
  const url = () => `${window.location.origin}/r/${view.code}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url()).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    if (!navigator.share) return copy();
    await navigator.share({ title: "One More Clue", text: `Join my case: ${view.case.title}`, url: url() }).catch(() => undefined);
  };

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 pb-28">
      <CaseCover view={view} />
      <VoiceControl mode={view.mode} />

      <Panel>
        <p className="text-sm font-bold text-cream/70">Room code</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <p className="flex gap-1.5" aria-label={view.code.split("").join(" ")}>
            {view.code.split("").map((c, i) => (
              <span key={i} className="grid h-16 w-12 place-items-center rounded-2xl border-[3px] border-ink bg-cream font-display text-4xl text-ink shadow-pop-sm">
                {c}
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={share} className="px-5 py-2.5 text-base">
              <Icon name="share" className="size-4" /> Invite friends
            </Button>
            <Button variant="secondary" onClick={copy} className="px-5 py-2.5 text-base">
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title={`Detectives ${count}/${view.case.maxPlayers}`}>
        <ul className="grid gap-2">
          {view.players.map((p, i) => (
            <PlayerRow key={p.id} player={p} index={i} speaking={speaking.has(p.id)}>
              {isHost && p.id !== view.me.id && (
                <button type="button" onClick={() => act({ type: "kick", playerId: p.id })} className="text-sm font-extrabold text-coral-dk hover:underline">
                  Remove
                </button>
              )}
            </PlayerRow>
          ))}
          {Array.from({ length: view.case.maxPlayers - count }, (_, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border-[3px] border-dashed border-cream/15 px-3 py-2 text-sm font-bold text-cream/35">
              <span className="size-10 rounded-full border-[3px] border-dashed border-cream/15" />
              {i === 0 ? "Waiting for a detective…" : "Open seat"}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-bold text-cream/60">
          Everyone gets a role with its own evidence and a special ability. With fewer players, some hold two.
        </p>
        {isHost && view.testBots && count < view.case.maxPlayers && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-lilac/50 p-3">
            <Button variant="secondary" className="px-4 py-2 text-base" disabled={busy} onClick={() => act({ type: "addBot" })}>
              <Icon name="robot" className="size-4" /> Add a test bot
            </Button>
            <p className="flex-1 text-sm font-bold text-cream/55">Test builds only. Bots pin their evidence, use their ability once a chapter and vote like you.</p>
          </div>
        )}
      </Panel>

      <Panel title="Where are you playing?">
        <ModePicker value={view.mode} disabled={!isHost} onChange={(mode) => act({ type: "setMode", mode })} />
        {!isHost && <p className="mt-3 text-sm font-bold text-cream/60">The host picks this.</p>}
      </Panel>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-night/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button type="button" onClick={() => act({ type: "leave" })} className="font-extrabold text-cream/60 hover:text-coral">
            Leave
          </button>
          {isHost ? (
            <Button
              onClick={async () => {
                if (await act({ type: "start" })) trackEvent("game_started", { case: view.case.id, players: count, mode: view.mode });
              }}
              disabled={!enough || busy}
            >
              {enough ? "Start the case" : `Need ${view.case.minPlayers - count} more`}
            </Button>
          ) : (
            <p className="flex items-center gap-2 font-bold text-cream/80">
              <span className="size-2.5 animate-pulse rounded-full bg-mustard" /> Waiting for the host to start
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
