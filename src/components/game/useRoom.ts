"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";

/** Without live updates, phones check the room this often. */
const POLL_MS = 2000;
/** With live updates connected, polling is only a safety net. */
const SAFETY_POLL_MS = 12_000;
const HIDDEN_POLL_MS = 15_000;
/** Show "still here" to the others roughly every 10 seconds. */
const HEARTBEAT_MS = 10_000;

export type RoomStatus =
  | { kind: "loading" }
  | { kind: "ready"; view: PlayerView }
  | { kind: "needsJoin"; message: string }
  | { kind: "closed"; message: string };

/**
 * Keeps this player's view of the room fresh and sends actions. Each poll
 * tells the server which version this phone has, so an unchanged room costs
 * almost nothing. `live` slows polling down when instant updates arrive
 * another way; call `refresh` when one does.
 */
export function useRoom(code: string, live: boolean) {
  const [status, setStatus] = useState<RoomStatus>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const version = useRef<number | null>(null);
  const lastBeat = useRef(0);
  /** Bots only move on full polls, so rooms with bots skip the cheap check. */
  const hasBots = useRef(false);
  const liveRef = useRef(live);
  const wake = useRef<() => void>(() => {});

  const accept = useCallback((view: PlayerView) => {
    // A slow poll must not roll back a newer view that an action already returned.
    if (version.current !== null && view.version < version.current) return;
    version.current = view.version;
    hasBots.current = view.players.some((p) => p.bot);
    setStatus({ kind: "ready", view });
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      const now = Date.now();
      const beat = hasBots.current || now - lastBeat.current > HEARTBEAT_MS;
      const query = new URLSearchParams();
      if (version.current !== null && !force) query.set("v", String(version.current));
      if (beat) query.set("beat", "1");
      const res = await fetch(`/api/rooms/${code}?${query}`, { cache: "no-store" }).catch(() => null);
      if (!res || res.status === 204) return;
      if (beat && res.ok) lastBeat.current = now;
      const body = await res.json().catch(() => ({}));
      if (res.ok) accept(body);
      else if (res.status === 403 && body.error === "Join this room first.") setStatus({ kind: "needsJoin", message: body.error });
      else if (res.status === 403 || res.status === 404 || res.status === 410) setStatus({ kind: "closed", message: body.error });
    },
    [accept, code],
  );

  useEffect(() => {
    liveRef.current = live;
    wake.current();
  }, [live]);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const loop = async () => {
      window.clearTimeout(timer);
      await refresh();
      if (stopped) return;
      const wait = document.hidden ? HIDDEN_POLL_MS : liveRef.current ? SAFETY_POLL_MS : POLL_MS;
      timer = window.setTimeout(loop, wait);
    };
    wake.current = () => {
      if (stopped) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(loop, 0);
    };
    const onVisible = () => !document.hidden && wake.current();
    loop();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 4500);
    return () => window.clearTimeout(timer);
  }, [error]);

  /** Called by live updates: fetch now if the room has moved past what this phone has. */
  const nudge = useCallback(
    (latest: number) => {
      if (version.current === null || latest > version.current) refresh();
    },
    [refresh],
  );

  /** Sends an action; resolves to false if the room refused it, showing the reason unless `quiet`. */
  const act = useCallback(
    async (action: Action, options?: { quiet?: boolean }) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/rooms/${code}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!options?.quiet) setError(body.error ?? "That didn't work. Try again.");
          return false;
        }
        if (body.view) accept(body.view);
        else setStatus({ kind: "closed", message: "You left the room." });
        return true;
      } catch {
        setError("You seem to be offline. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [accept, code],
  );

  const join = useCallback(
    async (name: string) => {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => null);
      const body = await res?.json().catch(() => ({}));
      if (!res?.ok) {
        setError(body?.error ?? "Couldn't join. Try again.");
        return false;
      }
      lastBeat.current = 0;
      await refresh(true);
      return true;
    },
    [code, refresh],
  );

  return { status, error, setError, busy, act, join, nudge };
}
