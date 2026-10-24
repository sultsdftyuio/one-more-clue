"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { SuspectId } from "@/data/suspects";
import type { EvidenceBody, SceneItem, SceneLook } from "@/lib/game/types";
import { propArt, suspectArt, type PropName } from "@/lib/art";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";
import { Icon } from "../ui/Icon";

type Scene = Extract<EvidenceBody, { type: "scene" }>;
type Footage = Extract<EvidenceBody, { type: "footage" }>;

/** Per-case colours for the house characters, by art name: { square: 140 } rotates the square's hue. */
export type Tints = Record<string, number>;

function artFor(key: string, shocked?: boolean) {
  const [kind, name] = key.split(":");
  if (kind === "suspect" && name in suspectArt) return suspectArt[name as SuspectId][shocked ? "shocked" : "idle"];
  if (kind === "prop" && name in propArt) return propArt[name as PropName];
  return null;
}

function ItemBody({ item, tints }: { item: SceneItem; tints?: Tints }) {
  if (item.kind === "art") {
    const src = artFor(item.art, item.shocked);
    if (!src) return null;
    const tint = tints?.[item.art.split(":")[1]];
    return (
      <Image
        src={src}
        alt=""
        sizes="(max-width: 640px) 30vw, 200px"
        className={cx("w-full", item.flip && "-scale-x-100")}
        style={tint ? { filter: `hue-rotate(${tint}deg)` } : undefined}
        draggable={false}
      />
    );
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

type CanvasProps = {
  look: SceneLook;
  items: SceneItem[];
  /** Pitch dark: only what the flashlight touches can be seen. */
  dark?: boolean;
  /** When set, the viewer can tap things: hotspots call this, anything else says "nothing here". */
  onInspect?: (hotspot: string) => Promise<boolean>;
  /** Hotspots already found, marked with a tick. */
  found?: string[];
  tints?: Tints;
};

type Ripple = { id: number; x: number; y: number; text: string };

/** The 4:3 picture itself, shared by photos and camera footage. */
function SceneCanvas({ look, items, dark, onInspect, found = [], tints }: CanvasProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const light = useRef<HTMLDivElement>(null);
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

  /** The flashlight follows the mouse, or a finger dragged across the picture. */
  const aim = (clientX: number, clientY: number, target: HTMLElement) => {
    const box = target.getBoundingClientRect();
    light.current?.style.setProperty("--fx", `${clientX - box.left}px`);
    light.current?.style.setProperty("--fy", `${clientY - box.top}px`);
  };

  return (
    <div
      data-scene
      onClick={(e) => tap(e)}
      onPointerMove={dark ? (e: ReactPointerEvent<HTMLDivElement>) => aim(e.clientX, e.clientY, e.currentTarget) : undefined}
      onTouchMove={dark ? (e) => aim(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget) : undefined}
      className={cx(
        "relative aspect-[4/3] overflow-hidden rounded-md select-none",
        // In the dark, a finger dragged across the picture moves the light instead of scrolling.
        dark && "touch-none",
        `scene-${look}`,
        inspectable && "cursor-zoom-in",
      )}
    >
      {items.map((item, i) => {
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
                <ItemBody item={item} tints={tints} />
              </button>
            ) : (
              <ItemBody item={item} tints={tints} />
            )}
            {marked && (
              <span className="pointer-events-none absolute top-1/2 left-1/2 z-30 grid size-6 animate-[found-pop_0.4s_ease-out_both] place-items-center rounded-full border-2 border-ink bg-mustard text-xs font-black text-ink shadow-pop-sm">
                ✓
              </span>
            )}
          </span>
        );
      })}
      {dark && <div ref={light} aria-hidden className="flashlight pointer-events-none absolute inset-0 z-20" />}
      {ripples.map((r) => (
        <span key={r.id} className="pointer-events-none absolute z-30" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
          <span className="absolute size-24 animate-[ripple_0.9s_ease-out_forwards] rounded-full border-4 border-mustard" />
          <span className="absolute -translate-x-1/2 -translate-y-[160%] animate-pop-in rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-ink">
            {r.text}
          </span>
        </span>
      ))}
    </div>
  );
}

type ViewProps = Omit<CanvasProps, "look" | "items" | "dark">;

/** An illustrated photo or camera still. Dark photos are searched with a flashlight. */
export function SceneView({ scene, ...rest }: ViewProps & { scene: Scene }) {
  return (
    <figure className="rotate-[-0.6deg] rounded-xl border-[3px] border-ink bg-white p-2 pb-2.5 shadow-pop-sm">
      <SceneCanvas look={scene.look} items={scene.items} dark={scene.dark} {...rest} />
      <figcaption className="mt-2 px-1 text-center text-xs font-extrabold text-ink/70">
        {scene.dark && <span className="mr-1">🔦 Pitch dark: drag across it to shine your light.</span>}
        {scene.caption}
      </figcaption>
    </figure>
  );
}

/** Camera footage: play it, or scrub frame by frame. Every frame can be inspected. */
export function FootageView({ footage, ...rest }: ViewProps & { footage: Footage }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = footage.frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrame((f) => {
        if (f >= last) {
          setPlaying(false);
          return f;
        }
        play("tap");
        return f + 1;
      });
    }, 1400);
    return () => window.clearInterval(timer);
  }, [last, playing]);

  const current = footage.frames[frame];
  return (
    <figure className="rounded-xl border-[3px] border-ink bg-[#111] p-2 pb-2.5 text-cream shadow-pop-sm">
      <div className="relative">
        <SceneCanvas key={frame} look={footage.look} items={current.items} {...rest} />
        <span className="pointer-events-none absolute top-2 right-2 z-30 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-white">
          <span className="size-2 animate-pulse rounded-full bg-coral" /> {current.time}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => {
            if (frame >= last) setFrame(0);
            setPlaying((p) => !p);
          }}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-cream text-ink"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : <Icon name="skip" className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={frame}
          onChange={(e) => {
            setPlaying(false);
            setFrame(Number(e.target.value));
          }}
          aria-label="Scrub through the footage"
          className="min-w-0 flex-1 accent-coral"
        />
        <span className="shrink-0 font-mono text-xs font-bold text-cream/70">
          {frame + 1}/{footage.frames.length}
        </span>
      </div>
      <figcaption className="mt-1.5 px-1 text-center text-xs font-extrabold text-cream/60">{footage.caption}</figcaption>
    </figure>
  );
}
