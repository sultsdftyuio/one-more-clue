"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { RemoteTrack, Room } from "livekit-client";
import { trackEvent } from "@/lib/analytics";

export type Live = {
  /** LiveKit is set up for this room, so voice can be joined. */
  available: boolean;
  /** This phone is in the room's voice channel (and so gets instant updates). */
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
  available: false,
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

type Pass = { url: string; token: string; at: number };
/** Passes last 6 hours on the server; fetch a new one well before that. */
const PASS_FRESH_MS = 5 * 60 * 60 * 1000;

const fetchPass = (code: string): Promise<Pass | null> =>
  fetch(`/api/rooms/${code}/live`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((p) => (p?.enabled ? { url: p.url, token: p.token, at: Date.now() } : null))
    .catch(() => null);

type LiveKit = typeof import("livekit-client");

/**
 * The room's LiveKit voice channel. A phone only connects while its player is
 * in voice, because LiveKit bills every connected minute; everyone else keeps
 * up by polling. While connected, `onNudge` fires with the room's new version
 * whenever the server saves a change.
 */
export function useLive(code: string, enabled: boolean, onNudge: (version: number) => void): Live {
  const room = useRef<Room | null>(null);
  const pass = useRef<Pass | null>(null);
  const livekit = useRef<LiveKit | null>(null);
  const audio = useRef(new Map<string, HTMLMediaElement[]>());
  const listening = useRef(false);
  const silencedRef = useRef(new Set<string>());
  const nudge = useRef(onNudge);
  useEffect(() => {
    nudge.current = onNudge;
  }, [onNudge]);

  const [available, setAvailable] = useState(false);
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

  /** Closes the connection (which stops LiveKit's meter) and removes every voice it played. */
  const hangUp = useCallback(() => {
    listening.current = false;
    const lk = room.current;
    room.current = null;
    lk?.disconnect();
    for (const list of audio.current.values()) list.forEach((el) => el.remove());
    audio.current.clear();
    setConnected(false);
    setSpeaking(new Set());
    setSoundBlocked(false);
  }, []);

  // Only finds out whether voice is set up, and loads the library so joining is quick.
  // Nothing connects until the player taps Join voice.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const p = await fetchPass(code);
      if (cancelled || !p) return;
      pass.current = p;
      livekit.current = await import("livekit-client").catch(() => null);
      if (!cancelled && livekit.current) setAvailable(true);
    })();
    return () => {
      cancelled = true;
      hangUp();
      setVoice("off");
    };
  }, [code, enabled, hangUp]);

  const joinVoice = useCallback(async () => {
    const lib = livekit.current;
    if (!lib || room.current) return;
    const { Room, RoomEvent, Track } = lib;
    setError(null);
    setVoice("joining");

    const lk = new Room({
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    room.current = lk;
    // Browsers only allow sound inside the tap that called this, so ask before any waiting.
    const unlocked = lk.startAudio().catch(() => undefined);

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
    lk.on(RoomEvent.AudioPlaybackStatusChanged, () => setSoundBlocked(listening.current && !lk.canPlaybackAudio));
    lk.on(RoomEvent.Reconnecting, () => setConnected(false));
    lk.on(RoomEvent.Reconnected, () => setConnected(true));
    lk.on(RoomEvent.Disconnected, () => {
      // Our own hang-up has already moved on; this is the connection dropping.
      if (room.current !== lk) return;
      hangUp();
      setVoice("off");
    });

    try {
      if (!pass.current || Date.now() - pass.current.at > PASS_FRESH_MS) pass.current = await fetchPass(code);
      if (!pass.current) throw new Error("No voice pass");
      await lk.connect(pass.current.url, pass.current.token, { autoSubscribe: true });
      if (room.current !== lk) return; // they left while it was connecting
      await unlocked;
      await lk.localParticipant.setMicrophoneEnabled(true);
      listening.current = true;
      setConnected(true);
      applyAudio();
      setMuted(false);
      setVoice("on");
      trackEvent("voice_joined");
      setSoundBlocked(!lk.canPlaybackAudio);
    } catch (e) {
      if (room.current !== lk) return;
      hangUp();
      const blocked = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(blocked ? "Your microphone is blocked. Allow it in your browser's settings, then try again." : "Couldn't start voice. Try again.");
      setVoice("off");
    }
  }, [applyAudio, code, hangUp]);

  const leaveVoice = useCallback(async () => {
    hangUp();
    setVoice("off");
  }, [hangUp]);

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
  return { available, connected, voice, muted, speaking, silenced, soundBlocked, error, joinVoice, leaveVoice, toggleMute, toggleSilenced, startSound };
}
