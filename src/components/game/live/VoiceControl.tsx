"use client";

import type { Mode } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { Icon } from "../ui/Icon";
import { useLiveRoom } from "./useLive";

/**
 * Voice chat controls for remote rooms. `compact` fits the investigation's top
 * bar; the full card sits in the lobby and briefing so people join early.
 */
export function VoiceControl({ mode, compact }: { mode: Mode; compact?: boolean }) {
  const live = useLiveRoom();
  if (mode !== "remote" || !live.connected) return null;

  const soundPrompt = live.soundBlocked && (
    <button
      type="button"
      onClick={live.startSound}
      className="animate-pulse rounded-full border-2 border-ink bg-coral px-3 py-1 text-xs font-extrabold text-cream"
    >
      Tap to turn on sound
    </button>
  );

  if (compact) {
    if (live.voice !== "on") {
      return (
        <button
          type="button"
          onClick={live.joinVoice}
          disabled={live.voice === "joining"}
          className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-teal px-3 py-1.5 text-sm font-extrabold text-ink disabled:opacity-60"
          title={live.error ?? "Join the voice chat"}
        >
          <Icon name="headset" className="size-4" />
          <span className="max-sm:sr-only">{live.voice === "joining" ? "Joining…" : "Voice"}</span>
        </button>
      );
    }
    return (
      <span className="flex items-center gap-1.5">
        {soundPrompt}
        <button
          type="button"
          onClick={live.toggleMute}
          aria-pressed={live.muted}
          aria-label={live.muted ? "Unmute your microphone" : "Mute your microphone"}
          className={cx("grid size-9 place-items-center rounded-full border-2 border-ink", live.muted ? "bg-coral text-cream" : "bg-teal text-ink")}
        >
          <Icon name={live.muted ? "micOff" : "mic"} className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-3xl border-[3px] border-ink bg-teal/90 p-4 text-ink shadow-card">
      <span className="grid size-11 place-items-center rounded-2xl border-[3px] border-ink bg-cream">
        <Icon name="headset" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl leading-tight">Voice chat</span>
        <span className="block text-sm leading-snug font-semibold">
          {live.voice === "on"
            ? live.muted
              ? "You're muted. Others can't hear you."
              : "You're live. Everyone in voice can hear you."
            : "Talk it through while you play. Nothing is recorded."}
        </span>
        {live.error && <span className="mt-1 block text-sm font-extrabold text-coral-dk">{live.error}</span>}
      </span>
      {soundPrompt}
      {live.voice === "on" ? (
        <span className="flex gap-2">
          <button
            type="button"
            onClick={live.toggleMute}
            className={cx("flex items-center gap-1.5 rounded-full border-[3px] border-ink px-4 py-2 font-display", live.muted ? "bg-coral text-cream" : "bg-cream")}
          >
            <Icon name={live.muted ? "micOff" : "mic"} className="size-4" /> {live.muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" onClick={live.leaveVoice} className="rounded-full border-[3px] border-ink bg-night px-4 py-2 font-display text-cream">
            Leave
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={live.joinVoice}
          disabled={live.voice === "joining"}
          className="rounded-full border-[3px] border-ink bg-cream px-5 py-2 font-display text-lg shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {live.voice === "joining" ? "Connecting…" : "Join voice"}
        </button>
      )}
    </section>
  );
}
