"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidenceBody, TapeSound } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { playTape, unlock } from "../audio/sound";

type Recording = Extract<EvidenceBody, { type: "recording" }>;

/** How long each kind of moment plays, in ms. Silence is long on purpose: it's the point. */
const LENGTH: Record<TapeSound, number> = {
  speech: 2200,
  music: 1600,
  jingle: 1600,
  static: 1600,
  click: 1000,
  creak: 1200,
  breath: 1300,
  beep: 1000,
  door: 1200,
  silence: 2600,
};

/** Bar heights for the waveform, so the shape of the tape tells a story at a glance. */
const LEVEL: Record<TapeSound, number> = {
  speech: 0.7,
  music: 0.85,
  jingle: 1,
  static: 0.55,
  click: 0.4,
  creak: 0.3,
  breath: 0.2,
  beep: 0.45,
  door: 0.9,
  silence: 0.03,
};

const ICON: Partial<Record<TapeSound, string>> = { music: "♪", jingle: "♫", static: "≋", click: "✕", creak: "~", breath: "…", beep: "•", door: "▮" };

/**
 * A tape recording you play back: a cassette with a waveform, captions that
 * light up in time, and every sound synthesised. You can also just read it.
 */
export function RecordingPlayer({ recording }: { recording: Recording }) {
  const [current, setCurrent] = useState(-1);
  const playing = current >= 0;
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const stop = () => {
    window.clearTimeout(timer.current);
    setCurrent(-1);
  };

  const playFrom = (index: number) => {
    window.clearTimeout(timer.current);
    if (index >= recording.segments.length) return setCurrent(-1);
    setCurrent(index);
    const segment = recording.segments[index];
    playTape(segment.sound);
    timer.current = window.setTimeout(() => playFrom(index + 1), LENGTH[segment.sound]);
  };

  return (
    <div className="overflow-hidden rounded-2xl border-[3px] border-ink bg-[#1c1a24] text-cream">
      <div className="flex items-center gap-3 border-b-2 border-black/40 bg-[#2a2733] px-3 py-2">
        <button
          type="button"
          onClick={() => {
            unlock();
            if (playing) stop();
            else playFrom(0);
          }}
          className={cx(
            "grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-ink font-black transition-colors",
            playing ? "bg-coral text-cream" : "bg-mustard text-ink",
          )}
          aria-label={playing ? "Stop the tape" : "Play the tape"}
        >
          {playing ? "■" : "▶"}
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs font-bold tracking-widest text-cream/60 uppercase">{recording.caption}</span>
          {/* Cassette reels, turning while it plays */}
          <span className="mt-1 flex items-center gap-2" aria-hidden>
            {[0, 1].map((i) => (
              <span key={i} className={cx("size-5 rounded-full border-[3px] border-dashed border-cream/50", playing && "animate-spin [animation-duration:1.6s]")} />
            ))}
            <span className="h-1 flex-1 rounded-full bg-cream/15">
              <span
                className="block h-full rounded-full bg-mustard transition-[width] duration-500"
                style={{ width: `${playing ? ((current + 1) / recording.segments.length) * 100 : 0}%` }}
              />
            </span>
          </span>
        </span>
      </div>

      <div className="flex h-12 items-end gap-0.5 px-3 pt-2" aria-hidden>
        {recording.segments.map((s, i) =>
          Array.from({ length: 4 }, (_, k) => (
            <span
              key={`${i}-${k}`}
              className={cx("flex-1 rounded-t-sm transition-colors", i === current ? "bg-mustard" : i < current ? "bg-cream/45" : "bg-cream/20")}
              style={{ height: `${Math.max(4, LEVEL[s.sound] * (60 + ((i * 7 + k * 13) % 40)))}%` }}
            />
          )),
        )}
      </div>

      <ol className="space-y-1 p-3 font-mono text-sm">
        {recording.segments.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                unlock();
                playFrom(i);
              }}
              className={cx(
                "flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left transition-colors",
                i === current ? "bg-mustard/20 text-cream" : "text-cream/75 hover:bg-cream/5",
              )}
            >
              <span className="shrink-0 text-xs font-bold text-coral">{s.at}</span>
              <span className={cx("flex-1", s.sound === "silence" && "tracking-widest text-cream/40 italic")}>
                {ICON[s.sound] && <span className="mr-1 text-mustard">{ICON[s.sound]}</span>}
                {s.text}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
