"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";

const POLL_MS = 2000;
const HIDDEN_POLL_MS = 8000;

export type RoomStatus =
  | { kind: "loading" }
  | { kind: "ready"; view: PlayerView }
  | { kind: "needsJoin"; message: string }
  | { kind: "closed"; message: string };

/**
 * Keeps this player's view of the room fresh by polling, and sends actions.
 * Polling slows down while the tab is hidden and catches up when it's back.
 */
export function useRoom(code: string) {
  const [status, setStatus] = useState<RoomStatus>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const version = useRef(0);

  const accept = useCallback((view: PlayerView) => {
    // A slow poll must not roll back a newer view that an action already returned.
    if (view.version < version.current) return;
    version.current = view.version;
    setStatus({ kind: "ready", view });
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" }).catch(() => null);
    if (!res) return;
    const body = await res.json().catch(() => ({}));
    if (res.ok) accept(body);
    else if (res.status === 403 && body.error === "Join this room first.") setStatus({ kind: "needsJoin", message: body.error });
    else if (res.status === 403 || res.status === 404 || res.status === 410) setStatus({ kind: "closed", message: body.error });
  }, [accept, code]);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const loop = async () => {
      await refresh();
      if (!stopped) timer = window.setTimeout(loop, document.hidden ? HIDDEN_POLL_MS : POLL_MS);
    };
    const onVisible = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      loop();
    };
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

  /** Sends an action; resolves to false (and shows the reason) if the room refused it. */
  const act = useCallback(
    async (action: Action) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/rooms/${code}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? "That didn't work. Try again.");
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
        return;
      }
      await refresh();
    },
    [code, refresh],
  );

  return { status, error, setError, busy, act, join };
}
