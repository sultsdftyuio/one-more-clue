"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { EvidenceBody } from "@/lib/game/types";
import { play } from "../audio/sound";
import { ZoomedSpot } from "../evidence/SceneView";
import { usePrefersReducedMotion } from "../evidence/Viewfinder";
import { buzz, BUZZ } from "../haptics";
import { askForMotion, listenForShake, motionNeedsAsking, motionReady } from "../motion";
import { cx } from "@/lib/cx";
import { Icon } from "../ui/Icon";

/**
 * A catch comes out of the camera as a blank instant photo. Shake the phone,
 * or rub the print with a finger, and the picture comes up with its few words
 * written under it: what's in the shot, never what it means. With reduced
 * motion it develops by itself, and after a few seconds anyone can just tap to
 * finish it.
 */
export function DevelopPrint({ scene, hotspot, title, note, onDeveloped }: { scene: EvidenceBody; hotspot: string; title: string; note: string; onDeveloped: () => void }) {
  const reduced = usePrefersReducedMotion();
  const amount = useRef(0);
  const [progress, setProgress] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [canAsk, setCanAsk] = useState(false);
  const [stuck, setStuck] = useState(false);
  const rubbed = useRef<{ x: number; y: number } | null>(null);
  const finished = useRef(onDeveloped);
  useEffect(() => {
    finished.current = onDeveloped;
  }, [onDeveloped]);
  const done = progress >= 1;

  const add = useCallback((more: number) => {
    if (amount.current >= 1) return;
    amount.current = Math.min(1, amount.current + more);
    setProgress(amount.current);
    if (amount.current >= 1) {
      play("develop");
      buzz(BUZZ.hit);
      finished.current();
    }
  }, []);

  useEffect(() => {
    setShaking(motionReady());
    setCanAsk(motionNeedsAsking() && !motionReady());
    const timer = window.setTimeout(() => setStuck(true), 4500);
    return () => window.clearTimeout(timer);
  }, []);

  // Less motion asked for: it comes up on its own.
  useEffect(() => {
    if (!reduced) return;
    const timer = window.setInterval(() => add(0.08), 90);
    return () => window.clearInterval(timer);
  }, [reduced, add]);

  useEffect(() => {
    if (!shaking || reduced) return;
    return listenForShake((force) => add(0.05 + force * 0.12));
  }, [shaking, reduced, add]);

  const rub = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && !e.buttons) return;
    const last = rubbed.current;
    rubbed.current = { x: e.clientX, y: e.clientY };
    if (last) add(Math.hypot(e.clientX - last.x, e.clientY - last.y) / 1800);
  };

  return (
    <div className="text-center">
      <figure
        onPointerDown={(e) => (rubbed.current = { x: e.clientX, y: e.clientY })}
        onPointerMove={rub}
        onPointerUp={() => (rubbed.current = null)}
        style={{ "--dev": progress } as CSSProperties}
        aria-label={title}
        className="mx-auto w-[min(21rem,92%)] -rotate-2 touch-none border-[3px] border-ink bg-white p-2 pb-3 shadow-card select-none"
      >
        <ZoomedSpot scene={scene} hotspot={hotspot} className="develop-image" />
        <figcaption className={cx("mt-2 min-h-7 px-1 font-hand text-[1.45rem] leading-tight text-ink", done && "animate-[rise-in_0.4s_ease-out]")}>{done ? note : ""}</figcaption>
      </figure>

      {done ? null : (
        <div className="mx-auto mt-4 max-w-xs">
          <p className="font-display text-xl leading-tight text-cream">{shaking && !reduced ? "Shake it to bring it up" : "Rub the print to bring it up"}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream/15" role="progressbar" aria-label="Developing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full rounded-full bg-mustard transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {canAsk && !shaking && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await askForMotion();
                  setShaking(ok);
                  setCanAsk(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mustard px-3.5 py-1.5 text-sm font-extrabold text-ink"
              >
                <Icon name="sparkle" className="size-4" /> Let me shake it
              </button>
            )}
            {stuck && (
              <button type="button" onClick={() => add(1)} className="rounded-full border-2 border-cream/30 px-3.5 py-1.5 text-sm font-extrabold text-cream hover:bg-cream/10">
                Develop it now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
