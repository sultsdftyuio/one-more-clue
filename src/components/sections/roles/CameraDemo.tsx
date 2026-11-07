"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useRef, useState, type PointerEvent } from "react";
import { sfx } from "@/components/home/sound";
import { rolesDemo } from "@/data/roles";
import { cx } from "@/lib/cx";
import { Cost, Handoff, Note } from "./shared";

const ZOOM = 2.6;
type Spot = (typeof rolesDemo.photo.spots)[number];

/** Where a spot sits in a print cropped around `at` (percent of the picture) at ZOOM. */
function cropOf(at: { x: number; y: number }) {
  const pos = (c: number) => Math.min(1, Math.max(0, ((c / 100) * ZOOM - 0.5) / (ZOOM - 1))) * 100;
  return { backgroundSize: `${ZOOM * 100}%`, backgroundPosition: `${pos(at.x)}% ${pos(at.y)}%` };
}

/** A print coming out of the camera: blank and bright, then the picture swims up. */
function Print({ spot, at, image }: { spot: Spot; at: { x: number; y: number }; image: string }) {
  return (
    <m.div
      className="mt-4 flex gap-4 rounded-2xl border-[0.1875rem] border-ink bg-cream p-3 text-ink shadow-pop-sm"
      initial={{ opacity: 0, y: -30, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ type: "spring", stiffness: 160, damping: 16 }}
    >
      <div className="w-32 shrink-0 rounded-md bg-white p-1.5 pb-5 shadow-[0_4px_10px_rgba(0,0,0,0.25)] sm:w-44">
        <div className="develop aspect-[4/3] rounded-sm" style={{ backgroundImage: `url(${image})`, ...cropOf(at) }} />
      </div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-extrabold tracking-widest text-coral uppercase">Developed</p>
        <p className="font-display text-xl leading-tight">{spot.title}</p>
        <p className="mt-1 text-sm font-semibold">{spot.text}</p>
      </div>
    </m.div>
  );
}

/**
 * Photographer: the camera. Tap the photo to zoom in where you tapped, then
 * press the shutter. A clue in the middle of the frame develops into a print;
 * anything else catches nothing, which in the game costs a little time.
 */
export function CameraDemo({ found, onFind, next }: { found: string[]; onFind: (id: string) => void; next: () => void }) {
  const { image, caption, spots } = rolesDemo.photo;
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [shot, setShot] = useState<{ spot: Spot | null; at: { x: number; y: number }; key: number } | null>(null);
  const [flash, setFlash] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const shotCount = spots.filter((s) => found.includes(s.id)).length;

  // Zoomed in, the picture slides so the aimed point sits in the middle (as far as the picture's edges allow).
  const shift = (c: number) => Math.max(-50 * (ZOOM - 1), Math.min(50 * (ZOOM - 1), (50 - c) * ZOOM));
  const move = aim ? { x: shift(aim.x), y: shift(aim.y) } : { x: 0, y: 0 };
  // Where the aimed point shows on screen, for the focus box.
  const mark = aim ? { x: 50 + (aim.x - 50) * ZOOM + move.x, y: 50 + (aim.y - 50) * ZOOM + move.y } : null;

  // Tapping while zoomed in re-aims at the point under your finger, not the point on the glass.
  const point = (e: PointerEvent<HTMLDivElement>) => {
    const r = frame.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 100;
    const sy = ((e.clientY - r.top) / r.height) * 100;
    if (!aim) return { x: sx, y: sy };
    return { x: 50 + (sx - 50 - move.x) / ZOOM, y: 50 + (sy - 50 - move.y) / ZOOM };
  };

  const shoot = () => {
    if (!aim) return;
    sfx.shutter();
    setFlash((n) => n + 1);
    const hit = spots.find((s) => aim.x >= s.x - 3 && aim.x <= s.x + s.w + 3 && aim.y >= s.y - 3 && aim.y <= s.y + s.h + 3) ?? null;
    setShot({ spot: hit, at: aim, key: Date.now() });
    if (hit) onFind(hit.id);
  };

  return (
    <div>
      {/* The camera body: a dark shell round the viewfinder. */}
      <div className="rounded-[1.6rem] border-[0.1875rem] border-ink bg-[linear-gradient(#3a3330,#221d1b)] p-2.5 shadow-pop-sm sm:p-3">
        <div className="mb-2 flex items-center justify-between px-1 font-mono text-[0.7rem] font-bold tracking-widest text-cream/60 uppercase">
          <span className="flex items-center gap-1.5">
            <span className={cx("size-2 rounded-full", aim ? "bg-coral shadow-[0_0_6px_var(--color-coral)]" : "bg-cream/30")} /> {aim ? `${ZOOM}× · ready` : "1× · tap to zoom"}
          </span>
          <span>{shotCount} of {spots.length} shot</span>
        </div>
        <div
          ref={frame}
          onPointerUp={(e) => setAim(point(e))}
          className="relative aspect-[4/3] cursor-crosshair touch-manipulation overflow-hidden rounded-xl bg-black select-none"
          role="button"
          tabIndex={0}
          aria-label="The café photo. Tap where you want to zoom in."
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const jar = spots[0];
              setAim({ x: jar.x + jar.w / 2, y: jar.y + jar.h / 2 });
            }
          }}
        >
          <m.div
            className="absolute inset-0"
            animate={{ scale: aim ? ZOOM : 1, x: `${move.x}%`, y: `${move.y}%` }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
          >
            <Image src={image} alt="A busy café counter on a Thursday night, posted to the café's Instagram" fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" draggable={false} />
            {spots
              .filter((s) => !aim && !found.includes(s.id))
              .map((s) => (
                <span
                  key={s.id}
                  aria-hidden
                  className="pointer-events-none absolute animate-ping rounded-lg border-2 border-cream/80"
                  style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`, animationDuration: "1.8s" }}
                />
              ))}
          </m.div>
          {/* Focus brackets, and a box on what the shot will catch. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "right-3 bottom-3 border-r-2 border-b-2"].map((c) => (
              <span key={c} className={cx("absolute size-6 border-cream/85", c)} />
            ))}
            {mark && (
              <m.span
                className="absolute h-[30%] w-[22%] -translate-1/2 rounded-md border-2 border-mustard"
                style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                initial={{ opacity: 0, scale: 1.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 160, damping: 20 }}
              />
            )}
          </div>
          <AnimatePresence>
            {flash > 0 && (
              <m.span key={flash} aria-hidden className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.45 }} />
            )}
          </AnimatePresence>
        </div>
        <p className="mt-1.5 px-1 font-mono text-[0.7rem] text-cream/55">{caption}</p>
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => setAim(null)}
            disabled={!aim}
            className="min-h-[44px] rounded-full border-2 border-cream/40 px-3 py-1.5 text-sm font-extrabold text-cream/85 transition-colors hover:border-cream disabled:opacity-30"
          >
            Zoom out
          </button>
          <button
            type="button"
            onClick={shoot}
            disabled={!aim}
            aria-label="Take the shot"
            className="grid size-16 place-items-center rounded-full border-[0.1875rem] border-ink bg-cream shadow-pop-sm transition-transform active:scale-90 disabled:opacity-40"
          >
            <span className="size-11 rounded-full border-[0.1875rem] border-ink bg-coral" />
          </button>
          <span className="w-[5.5rem] text-right text-xs font-extrabold text-cream/60">{aim ? "Shoot!" : "Zoom first"}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {shot?.spot ? (
          <Print key={shot.key} spot={shot.spot} at={shot.at} image={image} />
        ) : shot ? (
          <Note key={shot.key} tone="text-coral">
            Nothing sharp in that shot. Aim the middle of the frame at something odd.
          </Note>
        ) : (
          <Note key="hint">Something on the counter is glowing. Tap the photo near it to zoom in, then shoot.</Note>
        )}
      </AnimatePresence>
      <Cost>In the game you pinch to zoom, and a shot of nothing costs a few minutes of the night.</Cost>

      {shotCount > 0 && (
        <Handoff to="interviewer" onClick={next}>
          Now ask around
        </Handoff>
      )}
    </div>
  );
}
