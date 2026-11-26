"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { nameOf } from "@/components/game/context";
import type { PlayerView } from "@/lib/game/engine";
import type { Activity } from "@/lib/game/types";
import { SHRUGS } from "@/lib/game/voice";
import { cx } from "@/lib/cx";
import { plateToScreen } from "@/lib/world/camera";
import { spriteOf } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { Mood } from "@/lib/world/sprites";
import type { WorldState } from "@/lib/world/store";
import { playVoice } from "@/components/game/audio/sound";
import { recordingOf } from "@/components/game/audio/voices";
import { speakerOf } from "@/lib/game/voice";
import { useWorld, useWorldStore } from "./useWorld";

type Tone = "answer" | "crack" | "shrug" | "sore";
/** `say` is the words to speak in their recorded voice, when this phone should (see `voiceHere`). */
type Bubble = { key: string; person: string; text: string; caption: string | null; tone: Tone; until: number; say?: string };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** What a suspect's face does after each kind of moment, and for how long. An answer leaves them as they were. */
const REACTION: Partial<Record<Tone, { mood: Mood; ms: number }>> = { crack: { mood: "cracked", ms: 9000 }, shrug: { mood: "smug", ms: 4500 }, sore: { mood: "nervous", ms: 6000 } };

/**
 * Speech bubbles in the building (W5.3): when the Interviewer questions someone, the answer comes out of that person
 * where they stand, on every phone. Only phones that can read the answer see its words (it's the Interviewer's
 * evidence until it's pinned); everyone else sees them talking. A crack is told to the whole team, so everyone reads
 * it, and the suspect's face cracks; a shrug makes them smug. DOM placed from world coordinates, like the name tags.
 */
export function WorldBubbles({ plate, view, quiet = false }: { plate: WorldPlate; view: PlayerView; quiet?: boolean }) {
  const store = useWorldStore();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const resets = useRef(new Map<string, number>());
  const rewinding = useWorld((s) => s.rewind.open);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(view.activity.map((a) => a.id));
      return;
    }
    const fresh = view.activity.filter((a) => !seen.current!.has(a.id));
    fresh.forEach((a) => seen.current!.add(a.id));
    const now = Date.now();
    const made = fresh.flatMap((a) => {
      const b = bubbleFor(a, view, plate, now);
      return b ? [b] : [];
    });
    if (!made.length) return;
    setBubbles((list) => [...list.filter((b) => b.until > now && !made.some((m) => m.person === b.person)), ...made]);
    // They bob while they talk, for about as long as the line takes.
    for (const b of made) store.getState().setTalking(b.person, Math.min(b.until, now + 1500 + b.text.length * 45));
    // Their recorded voice (W7.1), unless the interrogation room is open here and already speaking it.
    if (!quiet) {
      for (const b of made) {
        const suspect = plate.people.find((p) => p.id === b.person)?.suspect;
        const name = view.case.suspects.find((s) => s.id === suspect)?.name;
        const recording = b.say && name ? recordingOf(view.case.id, speakerOf(view.case, name), b.say) : null;
        if (recording) void playVoice(recording.src);
      }
    }
    for (const b of made) {
      const reaction = REACTION[b.tone];
      if (!reaction) continue;
      const person = plate.people.find((p) => p.id === b.person);
      store.getState().setMood(b.person, reaction.mood);
      window.clearTimeout(resets.current.get(b.person));
      resets.current.set(
        b.person,
        window.setTimeout(() => store.getState().setMood(b.person, (person?.mood ?? "idle") as Mood), reaction.ms),
      );
    }
    // `quiet` is read when bubbles arrive, not a reason to look again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, plate, store]);

  useEffect(() => {
    const timers = resets.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Each bubble goes when its time is up.
  useEffect(() => {
    if (!bubbles.length) return;
    const next = Math.min(...bubbles.map((b) => b.until)) - Date.now();
    const timer = window.setTimeout(() => setBubbles((list) => list.filter((b) => b.until > Date.now())), Math.max(50, next));
    return () => window.clearTimeout(timer);
  }, [bubbles]);

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      const shown = s.viewport.w > 0 ? clamp((s.camera.zoom / s.range.closeUp - 0.4) / 0.2, 0, 1) : 0;
      for (const b of bubbles) {
        const node = nodes.current.get(b.key);
        const person = plate.people.find((p) => p.id === b.person);
        if (!node || !person) continue;
        const { feet, box } = spriteOf(plate, person, s.positions[b.person]);
        const at = plateToScreen(s.camera, s.viewport, feet.x, box.y);
        // Kept on screen, with the tail still pointing at whoever's talking.
        const x = clamp(at.x, 120, s.viewport.w - 120);
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, calc(-100% - 1.6rem))`;
        node.style.opacity = String(shown);
        const tail = node.querySelector<HTMLElement>("[data-tail]");
        if (tail) tail.style.left = `calc(50% + ${(at.x - x).toFixed(1)}px)`;
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.positions !== prev.positions) place(s);
    });
  }, [store, plate, bubbles]);

  if (!bubbles.length || rewinding) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-live="polite">
      {bubbles.map((b) => {
        const who = plate.people.find((p) => p.id === b.person)?.suspect;
        const name = view.case.suspects.find((s) => s.id === who)?.name ?? "";
        return (
          <div
            key={b.key}
            ref={(node) => {
              if (node) nodes.current.set(b.key, node);
              else nodes.current.delete(b.key);
            }}
            className="absolute top-0 left-0 w-max max-w-[min(15rem,70vw)] will-change-transform"
          >
            <div
              className={cx(
                "world-bubble relative rounded-2xl border-[3px] border-ink px-3 py-2 shadow-card",
                b.tone === "crack" ? "bg-coral text-cream" : b.tone === "shrug" ? "bg-lilac text-ink" : b.tone === "sore" ? "bg-[#bfe0ff] text-ink" : "bg-cream text-ink",
              )}
            >
              <p className="sr-only">{name} says:</p>
              <p className="text-sm leading-snug font-bold">{b.text}</p>
              {b.caption && <p className={cx("mt-0.5 text-[11px] font-extrabold", b.tone === "crack" ? "text-cream/80" : "text-ink/55")}>{b.caption}</p>}
              <span
                data-tail
                aria-hidden="true"
                className={cx(
                  "absolute top-full -mt-[3px] size-0 -translate-x-1/2 border-x-[9px] border-t-[12px] border-x-transparent",
                  b.tone === "crack" ? "border-t-coral" : b.tone === "shrug" ? "border-t-lilac" : b.tone === "sore" ? "border-t-[#bfe0ff]" : "border-t-cream",
                )}
                style={{ left: "50%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Whether this phone speaks a line out loud: every phone when the team plays apart, and only the asker's phone when
 * they're in one room, so a line is never heard four times over.
 */
const voiceHere = (view: PlayerView, a: Activity) => view.mode !== "together" || a.playerId === view.me.id;

/** The bubble a moment makes, if it's about a suspect standing in the building. */
export function bubbleFor(a: Activity, view: PlayerView, plate: Pick<WorldPlate, "people">, now: number): Bubble | null {
  if (!a.who) return null;
  const person = plate.people.find((p) => p.suspect === a.who);
  if (!person) return null;
  const asker = a.playerId === view.me.id ? "you" : a.playerId ? nameOf(view, a.playerId) : null;
  const hold = (text: string) => now + clamp(2500 + text.length * 55, 4000, 9000);
  if (a.kind === "found" && a.evidenceId) {
    const piece = view.evidence.find((e) => e.id === a.evidenceId);
    const text = piece?.body.type === "statement" ? `“${piece.body.text}”` : "…";
    const caption = piece ? (asker ? `to ${asker}` : null) : asker ? `talking to ${asker}` : "talking";
    // Pressure follows topics (W5.3, W6.2): a question on a sore spot the team has won makes them uneasy, whoever they are.
    const sore = view.helps.sore.find((s) => s.suspect === a.who && s.about.includes(a.evidenceId!));
    const say = piece?.body.type === "statement" && voiceHere(view, a) ? piece.body.text : undefined;
    if (sore) return { key: a.id, person: person.id, text, caption: `${caption ? `${caption} · ` : ""}uneasy: ${sore.topic}`, tone: "sore", until: hold(text), say };
    return { key: a.id, person: person.id, text, caption, tone: "answer", until: hold(text), say };
  }
  if (a.kind === "crack" && a.evidenceId) {
    const crack = view.cracks.find((c) => c.id === a.evidenceId);
    const text = crack ? `“${crack.text}”` : "…!";
    return { key: a.id, person: person.id, text, caption: "Cracked", tone: "crack", until: hold(text), say: crack && voiceHere(view, a) ? crack.text : undefined };
  }
  if (a.kind === "miss" || a.kind === "clock") {
    const shrugs = view.activity.filter((x) => x.who && (x.kind === "miss" || x.kind === "clock") && x.at <= a.at).length;
    const text = `“${SHRUGS[(shrugs - 1 + SHRUGS.length) % SHRUGS.length]}”`;
    return { key: a.id, person: person.id, text, caption: null, tone: "shrug", until: hold(text) };
  }
  return null;
}
