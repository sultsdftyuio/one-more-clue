"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { aimCamera } from "@/components/game/camera-events";
import { evidenceIn } from "@/components/game/context";
import { Icon } from "@/components/game/ui/Icon";
import type { PlayerView } from "@/lib/game/engine";
import type { WorldPlate } from "@/lib/world/plates";
import { coverRoom } from "./overRoom";
import { useWorld, useWorldStore } from "./useWorld";

const glass = "rounded-3xl border-[3px] border-ink bg-dusk/90 shadow-card backdrop-blur";

/** The picture a piece shows: a photo's painting, or the first painted frame of a tape. */
export function pictureOf(piece: { body: PlayerView["evidence"][number]["body"] } | undefined) {
  if (!piece) return null;
  if (piece.body.type === "scene") return piece.body.image ?? null;
  if (piece.body.type === "footage") return piece.body.frames.find((f) => f.image)?.image ?? null;
  return null;
}

/**
 * "Then and now" (W5.1): the Photographer holds an old photo up over the room it was taken in, live, and slides
 * between the two. What's changed since (a cabinet now empty, a laptop now locked) is for the eye to catch; nothing
 * here finds anything. "Shoot it" opens the camera on that photo, where details are found as on the classic screens.
 */
export function WorldThenNow({ plate, view, onShoot }: { plate: WorldPlate; view: PlayerView; onShoot: (evidenceId: string) => void }) {
  const store = useWorldStore();
  const thenNow = useWorld((s) => s.thenNow);
  const setThenNow = useWorld((s) => s.setThenNow);
  const [mix, setMix] = useState(0.65);
  const node = useRef<HTMLDivElement>(null);
  const piece = thenNow ? evidenceIn(view, thenNow.evidenceId) : undefined;
  const picture = pictureOf(piece);

  useLayoutEffect(() => {
    if (!thenNow || !node.current) return;
    const el = node.current;
    coverRoom(el, plate, store.getState(), thenNow.room);
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport) coverRoom(el, plate, s, thenNow.room);
    });
  }, [thenNow, plate, store, picture]);

  if (!thenNow || !piece || !picture || view.phase !== "investigation") return null;
  const caption = piece.body.type === "scene" || piece.body.type === "footage" ? piece.body.caption : piece.title;
  return (
    <>
      <div ref={node} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 overflow-hidden rounded-md will-change-transform" style={{ visibility: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={picture} alt="" draggable={false} className="size-full object-cover" style={{ opacity: mix }} />
        <span className="absolute inset-0 rounded-md border-4 border-dashed border-mustard/80" />
      </div>
      <section aria-label="Then and now" className={`${glass} pointer-events-auto absolute inset-x-3 bottom-[calc(7.4rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md p-3`}>
        <p className="flex items-center gap-2 pr-10 text-xs font-extrabold tracking-widest text-mustard uppercase">
          <Icon name="camera" className="size-4" /> Then and now
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-bold text-cream">{caption}</p>
        <label className="mt-2 flex items-center gap-3 text-xs font-extrabold text-cream/80">
          <span>Now</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(mix * 100)}
            onChange={(e) => setMix(Number(e.target.value) / 100)}
            aria-label="How much of the old photo shows over the room"
            className="min-w-0 flex-1 accent-mustard"
          />
          <span>Then</span>
        </label>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setThenNow(null);
              onShoot(piece.id);
              window.setTimeout(() => aimCamera(piece.id), 60);
            }}
            className="flex-1 rounded-2xl border-[3px] border-ink bg-mustard px-3 py-2 font-display text-lg text-ink shadow-pop-sm"
          >
            Shoot it
          </button>
          <button type="button" onClick={() => setThenNow(null)} className="rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 font-extrabold text-ink shadow-pop-sm">
            Done
          </button>
        </div>
      </section>
    </>
  );
}
