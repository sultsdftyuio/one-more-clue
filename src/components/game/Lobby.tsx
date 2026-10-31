"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import type { PlayerView } from "@/lib/game/engine";
import type { Act } from "./context";
import { AudioToggles } from "./audio/AudioToggles";
import { useLiveRoom } from "./live/useLive";
import { VoiceControl } from "./live/VoiceControl";
import { rememberName } from "./names";
import { Panel, PlayerRow, SuspectPortrait } from "./parts";
import { Icon } from "./ui/Icon";

/** Your own row in the lobby: tap your name to change it. */
function MyName({ view, act }: { view: PlayerView; act: Act }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(view.me.name);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === view.me.name || (await act({ type: "rename", name }))) {
      rememberName(name.trim());
      setEditing(false);
    }
  };
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-sm font-extrabold text-coral-dk hover:underline">
        Change name
      </button>
    );
  }
  return (
    <form onSubmit={save} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        autoFocus
        aria-label="Your detective name"
        className="w-36 rounded-xl border-2 border-ink bg-white px-2 py-1 font-bold text-ink outline-none focus:border-mustard"
      />
      <button type="submit" className="rounded-xl border-2 border-ink bg-mustard px-3 font-extrabold text-ink">
        Save
      </button>
    </form>
  );
}

export function CaseCover({ view }: { view: PlayerView }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border-[3px] border-ink bg-night/70 p-5 shadow-card ring-2 ring-[var(--case-accent)]/40 backdrop-blur-sm sm:p-7">
      <p className="text-xs font-extrabold tracking-[0.25em] text-[var(--case-accent)] uppercase">{view.case.code}</p>
      <h1 className="font-case mt-2 text-4xl leading-[1.05] text-cream text-pop sm:text-5xl">{view.case.title}</h1>
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
              {p.id === view.me.id && <MyName view={view} act={act} />}
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

      <Panel>
        <AudioToggles />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-cream/60">Playing apart? Talk in voice chat, or use the team chat once the case starts.</p>
          <VoiceControl compact />
        </div>
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
