"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import type { SuspectId } from "@/data/suspects";
import type { EvidenceBody, SceneItem } from "@/lib/game/types";
import { propArt, suspectArt, type PropName } from "@/lib/art";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";

type Scene = Extract<EvidenceBody, { type: "scene" }>;

function artFor(key: string, shocked?: boolean) {
  const [kind, name] = key.split(":");
  if (kind === "suspect" && name in suspectArt) return suspectArt[name as SuspectId][shocked ? "shocked" : "idle"];
  if (kind === "prop" && name in propArt) return propArt[name as PropName];
  return null;
}

function ItemBody({ item }: { item: SceneItem }) {
  if (item.kind === "art") {
    const src = artFor(item.art, item.shocked);
    if (!src) return null;
    return <Image src={src} alt="" sizes="(max-width: 640px) 30vw, 200px" className={cx("w-full", item.flip && "-scale-x-100")} draggable={false} />;
  }
  if (item.kind === "box") {
    return (
      <span
        className="grid size-full place-items-center text-[min(2.6vw,0.8rem)] font-extrabold tracking-wider"
        style={{ background: item.color, borderRadius: `${item.radius ?? 0}%`, color: item.textColor }}
      >
        {item.text}
      </span>
    );
  }
  return <span className={cx("block whitespace-nowrap text-[min(3.2vw,1.05rem)] leading-none", `scene-label-${item.style}`)}>{item.text}</span>;
}

type Props = {
  scene: Scene;
  /** When set, the viewer can tap things: hotspots call this, anything else says "nothing here". */
  onInspect?: (hotspot: string) => Promise<boolean>;
  /** Hotspots already found, marked with a pin. */
  found?: string[];
};

type Ripple = { id: number; x: number; y: number; text: string };

/** An illustrated photo or camera still, laid out in a 4:3 frame. */
export function SceneView({ scene, onInspect, found = [] }: Props) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const inspectable = Boolean(onInspect);

  const ripple = (e: MouseEvent, text: string) => {
    const box = e.currentTarget.closest("[data-scene]")!.getBoundingClientRect();
    const r = { id: Date.now() + Math.random(), x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100, text };
    setRipples((all) => [...all.slice(-2), r]);
    window.setTimeout(() => setRipples((all) => all.filter((x) => x.id !== r.id)), 1400);
  };

  const tap = async (e: MouseEvent, hotspot?: string) => {
    e.stopPropagation();
    if (!onInspect) return;
    if (!hotspot || found.includes(hotspot)) {
      play("miss");
      ripple(e, hotspot ? "Already noted" : "Nothing unusual");
      return;
    }
    const event = { currentTarget: e.currentTarget, clientX: e.clientX, clientY: e.clientY } as MouseEvent;
    const ok = await onInspect(hotspot);
    if (!ok) play("miss");
    ripple(event, ok ? "Found something!" : "Nothing unusual");
  };

  return (
    <figure className="rotate-[-0.6deg] rounded-xl border-[3px] border-ink bg-white p-2 pb-2.5 shadow-pop-sm">
      <div
        data-scene
        onClick={(e) => tap(e)}
        className={cx(
          "relative aspect-[4/3] overflow-hidden rounded-md select-none",
          `scene-${scene.look}`,
          inspectable && "cursor-zoom-in",
        )}
      >
        {scene.items.map((item, i) => {
          const style = {
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.kind === "label" ? undefined : `${item.w}%`,
            height: item.kind === "box" ? `${item.h}%` : undefined,
            rotate: "rotate" in item && item.rotate ? `${item.rotate}deg` : undefined,
          };
          const marked = item.hotspot && found.includes(item.hotspot);
          // Decorations let taps through to whatever is under them, so details drawn on top of a
          // clue (eyes on a face, notes in a jar) never block it.
          return (
            <span key={i} className={cx("absolute", !item.hotspot && "pointer-events-none")} style={style}>
              {inspectable && item.hotspot ? (
                <button
                  type="button"
                  onClick={(e) => tap(e, item.hotspot)}
                  className="block size-full cursor-zoom-in rounded focus-visible:outline-3 focus-visible:outline-mustard"
                  aria-label="Look closer"
                >
                  <ItemBody item={item} />
                </button>
              ) : (
                <ItemBody item={item} />
              )}
              {marked && (
                <span className="pointer-events-none absolute top-1/2 left-1/2 grid size-6 animate-[found-pop_0.4s_ease-out_both] place-items-center rounded-full border-2 border-ink bg-mustard text-xs font-black text-ink shadow-pop-sm">
                  ✓
                </span>
              )}
            </span>
          );
        })}
        {ripples.map((r) => (
          <span key={r.id} className="pointer-events-none absolute" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
            <span className="absolute size-24 animate-[ripple_0.9s_ease-out_forwards] rounded-full border-4 border-mustard" />
            <span className="absolute -translate-x-1/2 -translate-y-[160%] animate-pop-in rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-ink">
              {r.text}
            </span>
          </span>
        ))}
      </div>
      <figcaption className="mt-2 px-1 text-center text-xs font-extrabold text-ink/70">{scene.caption}</figcaption>
    </figure>
  );
}
