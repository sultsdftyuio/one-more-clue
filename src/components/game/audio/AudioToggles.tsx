"use client";

import { useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../ui/Icon";
import { getAudioSettings, play, setAudioSettings, subscribeAudio, unlock } from "./sound";

const SERVER = { sound: true, music: true };

export function useAudioSettings() {
  return useSyncExternalStore(subscribeAudio, getAudioSettings, () => SERVER);
}

/** Sound and music switches, remembered on this device. */
export function AudioToggles({ className }: { className?: string }) {
  const { sound, music } = useAudioSettings();
  const toggle = (key: "sound" | "music", value: boolean) => {
    unlock();
    setAudioSettings({ [key]: value });
    if (key === "sound" && value) play("tap");
  };
  const button = (on: boolean) =>
    cx(
      "flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink px-3 py-2 text-sm font-extrabold transition-colors",
      on ? "bg-mustard text-ink" : "bg-ink/10 text-ink/60",
    );
  return (
    <div className={cx("flex gap-2", className)}>
      <button type="button" onClick={() => toggle("sound", !sound)} aria-pressed={sound} className={button(sound)}>
        <Icon name={sound ? "speaker" : "speakerOff"} className="size-4" /> Sounds
      </button>
      <button type="button" onClick={() => toggle("music", !music)} aria-pressed={music} className={button(music)}>
        <Icon name="music" className="size-4" /> Music
      </button>
    </div>
  );
}
