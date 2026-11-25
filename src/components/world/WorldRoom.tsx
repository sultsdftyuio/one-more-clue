"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useStore } from "zustand";
import { myName, randomName, rememberName } from "@/components/game/names";
import { useRoom } from "@/components/game/useRoom";
import { castOf, stickersFor } from "@/lib/world/cast";
import { worldOf } from "@/lib/world/plates";
import { createWorldStore } from "@/lib/world/store";
import { worldArt } from "./assets";
import { WorldCanvas } from "./WorldCanvas";
import { WorldHud } from "./WorldHud";
import { WorldMinimap } from "./WorldMinimap";
import { WorldTags } from "./WorldTags";
import { WorldContext } from "./useWorld";

const card = "pointer-events-auto mx-auto w-full max-w-sm rounded-3xl border-[3px] border-ink bg-dusk p-5 text-center shadow-card";

/** Joins under this device's detective name, as the classic room does; asks for a name only if that fails. */
function WorldJoin({ onJoin }: { onJoin: (name: string) => Promise<boolean> }) {
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void onJoin(myName()).then((ok) => {
      if (ok) return;
      setName(randomName());
      setAsking(true);
    });
  }, [onJoin]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    if (await onJoin(name)) rememberName(name.trim());
    setSending(false);
  };

  if (!asking) return null;
  return (
    <form onSubmit={submit} className={`${card} select-text`}>
      <h2 className="font-display text-2xl text-cream">Join the case</h2>
      <label className="mt-3 grid gap-1.5 text-left font-bold text-cream">
        Your detective name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="nickname"
          className="rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink outline-none focus:border-mustard"
        />
      </label>
      <button
        type="submit"
        disabled={sending || !name.trim()}
        className="mt-4 w-full rounded-2xl border-[3px] border-ink bg-mustard px-4 py-3 font-display text-xl text-ink shadow-pop-sm disabled:opacity-60"
      >
        {sending ? "Joining…" : "Join"}
      </button>
    </form>
  );
}

/**
 * A world room on the hidden route: the painted building (Phaser) under React overlays, sharing one
 * store. The room itself still runs on today's engine and polling, so the classic screens at
 * /r/<code> keep working for the same room.
 */
export function WorldRoom({ code, caseId }: { code: string; caseId: string }) {
  const plate = worldOf(caseId);
  const art = worldArt(caseId);
  const [store] = useState(() => createWorldStore());
  const { status, error, join } = useRoom(code, false);
  const view = status.kind === "ready" ? status.view : null;

  useEffect(() => {
    store.getState().setView(view);
  }, [store, view]);

  const cast = useMemo(() => (plate ? castOf(plate.people, view) : {}), [plate, view]);
  const stickers = useMemo(() => {
    const worn = view ? stickersFor(view.players) : {};
    return Object.fromEntries(Object.entries(worn).map(([sticker, player]) => [player.id, sticker]));
  }, [view]);
  const mine = view ? (stickers[view.me.id] ?? null) : null;

  // Once the building is drawn and we know who you are, the camera flies in to your detective.
  const ready = useStore(store, (s) => s.status.stage === "ready");
  const arrived = useRef(false);
  useEffect(() => {
    if (!ready || !mine || arrived.current) return;
    arrived.current = true;
    store.getState().look({ kind: "person", id: mine });
  }, [ready, mine, store]);

  if (!plate || !art) {
    return (
      <div className="grid min-h-[100svh] place-items-center p-6">
        <p className="font-bold text-cream/80">This case has no building yet.</p>
      </div>
    );
  }

  return (
    <WorldContext.Provider value={store}>
      <div className="fixed inset-0 touch-none overflow-hidden bg-[linear-gradient(#030820,#141829)] text-cream select-none">
        <WorldCanvas store={store} plate={plate} art={art} />
        <WorldTags plate={plate} cast={cast} />
        <WorldHud code={code} view={view} cast={cast} stickers={stickers} minimap={<WorldMinimap plate={plate} picture={art.plateMap} mine={mine} />} />

        {status.kind === "needsJoin" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <WorldJoin onJoin={join} />
          </div>
        )}
        {status.kind === "closed" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className={card}>
              <h2 className="font-display text-2xl text-cream">Can&apos;t open this room</h2>
              <p className="mt-2 font-semibold text-cream/80">{status.message}</p>
              <Link href="/" className="mt-4 inline-block rounded-full border-2 border-ink bg-cream px-4 py-1.5 font-extrabold text-ink">
                Home
              </Link>
            </div>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="absolute inset-x-0 top-24 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] animate-pop-in rounded-2xl border-[3px] border-ink bg-coral px-4 py-2 text-center font-bold text-cream shadow-pop-sm"
          >
            {error}
          </p>
        )}
      </div>
    </WorldContext.Provider>
  );
}
