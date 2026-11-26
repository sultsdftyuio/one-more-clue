"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { play } from "@/components/game/audio/sound";
import { recordingOf, useVoice } from "@/components/game/audio/voices";
import type { Act } from "@/components/game/context";
import { Icon } from "@/components/game/ui/Icon";
import type { PlayerView } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { plateToScreen } from "@/lib/world/camera";
import { spriteOf } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";
import { useWorldStore } from "./useWorld";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The confrontation in the building (W9.1): once the team names the right person, the camera goes to them where
 * they stand and the rest of the building falls into shadow. Their story comes out claim by claim as a speech
 * bubble: the words only on the Interviewer's phone (the rules say only they hear it), a closed mouth elsewhere,
 * and a caught lie struck through on everyone's, with what they give up. A bar at the bottom has Press on for the
 * Interviewer and "Call a lie" for everyone, which opens the classic confrontation panel with the board.
 */
export function WorldConfrontation({ plate, view, act, busy, quiet, onCallLie }: { plate: WorldPlate; view: PlayerView; act: Act; busy: boolean; quiet: boolean; onCallLie: () => void }) {
  const store = useWorldStore();
  const room = view.phase === "investigation" ? view.interrogation : null;
  const live = Boolean(room && !room.over);
  const person = room ? plate.people.find((p) => p.suspect === room.suspect) : undefined;
  const suspect = room ? view.case.suspects.find((s) => s.id === room.suspect) : undefined;
  const shade = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);

  // The camera goes to them when it starts, and they bluff (smug) until a lie is caught (shocked).
  useEffect(() => {
    if (!live || !person) return;
    store.getState().look({ kind: "person", id: person.id });
    play("chapter");
  }, [live, person, store]);
  const caught = Boolean(room?.currentBroken);
  useEffect(() => {
    if (!person) return;
    store.getState().setMood(person.id, !live ? (person.mood ?? "idle") : caught ? "shocked" : "smug");
  }, [live, caught, person, store]);

  // Each new claim, they talk for a moment.
  useEffect(() => {
    if (!live || !person || !room) return;
    store.getState().setTalking(person.id, Date.now() + 1800 + (room.claim?.length ?? 20) * 45);
  }, [live, person, room?.index, room?.claim, store]); // eslint-disable-line react-hooks/exhaustive-deps

  // Their own recorded voice for the claim, on the Interviewer's phone, unless the panel is open and speaking it.
  const recording = room?.claim && !room.currentBroken && !quiet ? recordingOf(view.case.id, room.suspect, room.claim) : null;
  useVoice(recording, Boolean(room?.leads), room?.index);

  useLayoutEffect(() => {
    if (!live || !person) return;
    const place = (s: WorldState) => {
      const { feet, box } = spriteOf(plate, person, s.positions[person.id]);
      const head = plateToScreen(s.camera, s.viewport, feet.x, box.y);
      const mid = plateToScreen(s.camera, s.viewport, feet.x, box.y + box.h * 0.55);
      const r = Math.max(110, (box.h * s.camera.zoom) / 1.4);
      if (shade.current) shade.current.style.background = `radial-gradient(circle ${r.toFixed(0)}px at ${mid.x.toFixed(0)}px ${mid.y.toFixed(0)}px, transparent 55%, rgba(3,6,18,0.82) 100%)`;
      if (bubble.current) {
        const x = clamp(head.x, 140, s.viewport.w - 140);
        bubble.current.style.transform = `translate3d(${x.toFixed(1)}px, ${Math.max(150, head.y).toFixed(1)}px, 0) translate(-50%, calc(-100% - 1.2rem))`;
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.positions !== prev.positions) place(s);
    });
  }, [live, person, plate, store]);

  if (!room || !live || !person || !suspect) return null;
  const name = suspect.name.split(" ")[0];
  const crack = room.currentBroken ? room.broken.find((b) => b.text === room.claim)?.crack : undefined;
  const fresh = room.index === 0 && room.broken.length === 0 && room.strikes === 0;

  return (
    <>
      <div ref={shade} aria-hidden="true" className="pointer-events-none absolute inset-0 transition-[background] duration-300" />
      <div ref={bubble} className="pointer-events-none absolute top-0 left-0 z-10 w-max max-w-[min(18rem,78vw)] will-change-transform" aria-live="polite">
        <div className="world-bubble relative rounded-3xl border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-card">
          {fresh && <p className="mb-1 text-sm font-semibold text-ink/65 italic">&ldquo;{room.opening}&rdquo;</p>}
          <p className="text-[11px] font-extrabold tracking-wide text-ink/50 uppercase">
            {name} · claim {room.index + 1} of {room.total}
          </p>
          {room.claim ? (
            <p className={cx("text-base leading-snug font-bold", room.currentBroken && "text-ink/45 line-through decoration-coral decoration-[3px]")}>&ldquo;{room.claim}&rdquo;</p>
          ) : (
            <p className="text-base font-bold">
              &hellip; <span className="block text-sm font-semibold text-ink/65">Only the Interviewer hears this. Ask them to read it out, word for word.</span>
            </p>
          )}
          {crack && <p className="mt-1.5 rounded-xl bg-coral px-2.5 py-1.5 text-sm font-bold text-cream">&ldquo;{crack}&rdquo;</p>}
          {room.currentBroken && <span className="absolute -top-3 -right-2 rotate-12 rounded-lg border-[3px] border-coral bg-cream px-2 font-display text-lg text-coral">LIE</span>}
          <span aria-hidden="true" className="absolute top-full left-1/2 -mt-[3px] size-0 -translate-x-1/2 border-x-[10px] border-t-[13px] border-x-transparent border-t-cream" />
        </div>
      </div>
      <section
        aria-label="The confrontation"
        className="pointer-events-auto absolute inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-3xl border-[3px] border-ink bg-night/95 p-3 text-cream shadow-card"
      >
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-xs font-extrabold tracking-widest text-mustard uppercase">
            Facing {name} · {room.broken.length} {room.broken.length === 1 ? "lie" : "lies"} caught
          </p>
          <span className="flex gap-1" aria-label={`${room.strikesAllowed - room.strikes} of ${room.strikesAllowed} strikes left`}>
            {Array.from({ length: room.strikesAllowed }, (_, i) => (
              <span key={i} className={cx("grid size-5 place-items-center rounded-full border-2 border-ink", i < room.strikes ? "bg-coral text-cream" : "bg-cream/90 text-ink/25")}>
                <Icon name="x" className="size-3" />
              </span>
            ))}
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          {room.leads && (
            <>
              <button
                type="button"
                disabled={busy || Boolean(room.call)}
                onClick={() => act({ type: "press", step: -1 }, { quiet: true })}
                aria-label="Back to the last claim"
                className="grid size-11 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-cream text-ink disabled:opacity-50"
              >
                <Icon name="back" className="size-4" />
              </button>
              <button
                type="button"
                disabled={busy || Boolean(room.call)}
                onClick={() => act({ type: "press", step: 1 }, { quiet: true })}
                className="flex-1 rounded-2xl border-[3px] border-ink bg-lilac px-3 py-2 font-display text-lg text-ink disabled:opacity-50"
              >
                Press on
              </button>
            </>
          )}
          <button
            type="button"
            disabled={room.currentBroken || Boolean(room.call)}
            onClick={onCallLie}
            className="flex-1 rounded-2xl border-[3px] border-ink bg-coral px-3 py-2 font-display text-lg text-cream disabled:opacity-50"
          >
            {room.currentBroken ? "Caught" : "Call a lie"}
          </button>
        </div>
      </section>
    </>
  );
}
