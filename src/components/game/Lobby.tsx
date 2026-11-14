"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import type { PlayerView } from "@/lib/game/engine";
import type { Act } from "./context";
import { rememberName } from "./names";
import { Audience } from "./theatre/Audience";
import { Booth } from "./theatre/Booth";
import "./theatre/theatre.css";

/** Your own name, with a way to change it before the film rolls. */
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
      <span>
        You&apos;re {view.me.name} ·{" "}
        <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-[44px] items-center font-extrabold text-mustard hover:underline">
          Change name
        </button>
      </span>
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
        className="w-40 rounded-xl border-2 border-ink bg-cream px-2 py-1.5 font-bold text-ink outline-none focus:border-mustard"
      />
      <button type="submit" className="rounded-xl border-2 border-ink bg-mustard px-3 font-extrabold text-ink">
        Save
      </button>
    </form>
  );
}

/**
 * The lobby is a cinema. Friends arrive from their ticket into the audience; the host is
 * up in the projection booth, sending tickets and pulling the lever that rolls the film.
 */
export function Lobby({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  const host = view.players.find((p) => p.isHost)?.name ?? "the host";
  const url = () => `${window.location.origin}/r/${view.code}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url()).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    if (!navigator.share) return copy();
    await navigator.share({ title: "One More Clue", text: `Your ticket: ${view.case.title}`, url: url() }).catch(() => undefined);
  };
  const start = async () => {
    const ok = await act({ type: "start" });
    if (ok) trackEvent("game_started", { case: view.case.id, players: view.players.length, mode: view.mode });
    return ok;
  };
  const name = <MyName view={view} act={act} />;

  return (
    <div className="theatre min-h-[100svh]">
      {view.me.isHost ? (
        <Booth view={view} act={act} busy={busy} onShare={share} onCopy={copy} copied={copied} onStart={start} nameSlot={name} />
      ) : (
        <>
          <Audience view={view} act={act} onShare={share} nameSlot={name} />
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0b0d12]/95 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-3">
              <button type="button" onClick={() => act({ type: "leave" })} className="min-h-[44px] font-extrabold text-cream/60 hover:text-cream">
                Leave
              </button>
              <p className="flex min-w-0 items-center gap-2 text-sm font-extrabold">
                <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-mustard" />
                <span className="truncate">Waiting for {host} to start</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
