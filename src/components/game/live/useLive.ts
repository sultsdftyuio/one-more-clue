"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { RemoteTrack, Room } from "livekit-client";
import { trackEvent } from "@/lib/analytics";

export type Live = {
  /** LiveKit is set up and this phone is connected to the room's channel. */
  connected: boolean;
  voice: "off" | "joining" | "on";
  muted: boolean;
  /** Player ids talking right now. */
  speaking: Set<string>;
  /** Players this phone has silenced. */
  silenced: Set<string>;
  /** Browsers (iPhones especially) only play sound after a tap. */
  soundBlocked: boolean;
  error: string | null;
  joinVoice: () => Promise<void>;
  leaveVoice: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleSilenced: (playerId: string) => void;
  startSound: () => Promise<void>;
};

const OFF: Live = {
  connected: false,
  voice: "off",
  muted: false,
  speaking: new Set(),
  silenced: new Set(),
  soundBlocked: false,
  error: null,
  joinVoice: async () => {},
  leaveVoice: async () => {},
  toggleMute: async () => {},
  toggleSilenced: () => {},
  startSound: async () => {},
};

const LiveContext = createContext<Live>(OFF);
export const LiveProvider = LiveContext.Provider;
export const useLiveRoom = () => useContext(LiveContext);

/**
 * Connects to the room's LiveKit channel once this player is in the room.
 * `onNudge` fires with the room's new version whenever the server saves a
 * change. Voice is opt-in: nobody hears or is heard until they join it.
 */
export function useLive(code: string, enabled: boolean, onNudge: (version: number) => void): Live {
  const room = useRef<Room | null>(null);
  const audio = useRef(new Map<string, HTMLMediaElement[]>());
  const listening = useRef(false);
  const silencedRef = useRef(new Set<string>());
  const nudge = useRef(onNudge);
  useEffect(() => {
    nudge.current = onNudge;
  }, [onNudge]);

  const [connected, setConnected] = useState(false);
  const [voice, setVoice] = useState<Live["voice"]>("off");
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [silenced, setSilenced] = useState<Set<string>>(new Set());
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Plays or silences every remote voice according to the current settings. */
  const applyAudio = useCallback(() => {
    for (const [id, elements] of audio.current) {
      for (const el of elements) el.muted = !listening.current || silencedRef.current.has(id);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let lk: Room | null = null;
    const elements = audio.current;

    (async () => {
      const pass = await fetch(`/api/rooms/${code}/live`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (cancelled || !pass?.enabled) return;

      const { Room, RoomEvent, Track } = await import("livekit-client");
      lk = new Room({
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      room.current = lk;

      lk.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
        if (topic !== "room") return;
        try {
          const { v } = JSON.parse(new TextDecoder().decode(payload));
          if (typeof v === "number") nudge.current(v);
        } catch {}
      });
      lk.on(RoomEvent.ActiveSpeakersChanged, (speakers) => setSpeaking(new Set(speakers.map((s) => s.identity))));
      lk.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        el.style.display = "none";
        document.body.appendChild(el);
        audio.current.set(participant.identity, [...(audio.current.get(participant.identity) ?? []), el]);
        applyAudio();
      });
      lk.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, participant) => {
        const gone = track.detach();
        gone.forEach((el) => el.remove());
        audio.current.set(participant.identity, (audio.current.get(participant.identity) ?? []).filter((el) => !gone.includes(el)));
      });
      lk.on(RoomEvent.AudioPlaybackStatusChanged, () => setSoundBlocked(listening.current && !lk!.canPlaybackAudio));
      lk.on(RoomEvent.Reconnecting, () => setConnected(false));
      lk.on(RoomEvent.Reconnected, () => setConnected(true));
      lk.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setVoice("off");
      });

      try {
        await lk.connect(pass.url, pass.token, { autoSubscribe: true });
        if (!cancelled) setConnected(true);
      } catch {
        // Can't reach LiveKit: polling keeps the game going without voice.
      }
    })();

    return () => {
      cancelled = true;
      listening.current = false;
      lk?.disconnect();
      room.current = null;
      for (const list of elements.values()) list.forEach((el) => el.remove());
      elements.clear();
    };
  }, [applyAudio, code, enabled]);

  const joinVoice = useCallback(async () => {
    const lk = room.current;
    if (!lk) return;
    setError(null);
    setVoice("joining");
    try {
      // Both need the tap that called this, or the browser refuses.
      await lk.startAudio();
      await lk.localParticipant.setMicrophoneEnabled(true);
      listening.current = true;
      applyAudio();
      setMuted(false);
      setVoice("on");
      trackEvent("voice_joined");
      setSoundBlocked(!lk.canPlaybackAudio);
    } catch (e) {
      const blocked = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(blocked ? "Your microphone is blocked. Allow it in your browser's settings, then try again." : "Couldn't start voice. Try again.");
      setVoice("off");
    }
  }, [applyAudio]);

  const leaveVoice = useCallback(async () => {
    listening.current = false;
    applyAudio();
    await room.current?.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
    setVoice("off");
    setSoundBlocked(false);
  }, [applyAudio]);

  const toggleMute = useCallback(async () => {
    const lk = room.current;
    if (!lk) return;
    const next = !lk.localParticipant.isMicrophoneEnabled;
    await lk.localParticipant.setMicrophoneEnabled(next).catch(() => undefined);
    setMuted(!next);
  }, []);

  const toggleSilenced = useCallback(
    (playerId: string) => {
      const next = new Set(silencedRef.current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      silencedRef.current = next;
      setSilenced(next);
      applyAudio();
    },
    [applyAudio],
  );

  const startSound = useCallback(async () => {
    await room.current?.startAudio().catch(() => undefined);
    setSoundBlocked(Boolean(room.current && !room.current.canPlaybackAudio));
  }, []);

  if (!enabled) return OFF;
  return { connected, voice, muted, speaking, silenced, soundBlocked, error, joinVoice, leaveVoice, toggleMute, toggleSilenced, startSound };
}
