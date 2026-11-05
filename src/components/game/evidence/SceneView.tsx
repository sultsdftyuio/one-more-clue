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
  if (item.kind === "area") return null;
  return <span className={cx("block whitespace-nowrap text-[min(3.2vw,1.05rem)] leading-none", `scene-label-${item.style}`)}>{item.text}</span>;
}

/** How wide a scene's painted image can appear, so every copy of it shares one download. */
const IMAGE_SIZES = "(max-width: 640px) 100vw, 672px";

/** The lens is this share of the picture's width, and it magnifies the picture this many times. */
const LENS = 0.42;
const LENS_ZOOM = 3;

/** Moves the lens over a point of the 4:3 picture (0 to 1 each way), showing the matching part of the image. */
function aimLens(lens: HTMLElement, x: number, y: number) {
  lens.style.left = `${x * 100}%`;
  lens.style.top = `${y * 100}%`;
  const across = (x * LENS_ZOOM - LENS / 2) / (LENS_ZOOM - LENS);
  const down = (y * LENS_ZOOM - (LENS * 2) / 3) / (LENS_ZOOM - (LENS * 4) / 3);
  lens.style.backgroundPosition = `${across * 100}% ${down * 100}%`;
}

/** The magnifier follows a mouse. On a touch screen it stays out, and a finger dragged anywhere on the picture slides it along. */
function useMagnifier(on: boolean) {
  const lens = useRef<HTMLDivElement>(null);
  const spot = useRef({ x: 0.5, y: 0.5 });
  const finger = useRef<{ x: number; y: number; moved: number } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (!on || !lens.current) return;
    aimLens(lens.current, spot.current.x, spot.current.y);
    if (window.matchMedia("(hover: none)").matches) lens.current.style.opacity = "1";
  }, [on]);

  const move = (x: number, y: number) => {
    spot.current = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    if (lens.current) aimLens(lens.current, spot.current.x, spot.current.y);
  };

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return;
      finger.current = { x: e.clientX, y: e.clientY, moved: 0 };
      dragged.current = false;
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (e.pointerType === "mouse") {
        if (lens.current) lens.current.style.opacity = "1";
        move((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
      } else if (finger.current) {
        const { x, y, moved } = finger.current;
        const [dx, dy] = [e.clientX - x, e.clientY - y];
        finger.current = { x: e.clientX, y: e.clientY, moved: moved + Math.abs(dx) + Math.abs(dy) };
        // A little wobble is still a tap; past that it's a drag, and lifting the finger marks nothing.
        if (finger.current.moved > 8) dragged.current = true;
        move(spot.current.x + dx / box.width, spot.current.y + dy / box.height);
      }
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && lens.current) lens.current.style.opacity = "0";
    },
  };

  /** True once for the click that ends a drag, so sliding the lens never counts as a tap. */
  const endOfDrag = () => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  };

  return { lens, handlers: on ? handlers : undefined, endOfDrag };
}

type CanvasProps = {
  look: SceneLook;
  /** How wide the painted image shows, for picking the download size (the viewfinder asks for more as it zooms). */
  imageSizes?: string;
  onImageError?: () => void;
  items: SceneItem[];
  /** Pitch dark: only what the flashlight touches can be seen. */
  dark?: boolean;
  /** A painted picture, shown under the items. */
  image?: string;
  /** Read a painted picture through the magnifier. */
  magnify?: boolean;
  /** When set, the viewer can tap things: hotspots call this, anything else says "nothing here". */
  onInspect?: (hotspot: string) => Promise<boolean>;
  /** Hotspots already found, marked with a tick. */
  found?: string[];
  tints?: Tints;
};

type Ripple = { id: number; x: number; y: number; text: string };

/** The 4:3 picture itself, shared by photos and camera footage. */
export function SceneCanvas({ look, items, dark, image, imageSizes = IMAGE_SIZES, onImageError, magnify, onInspect, found = [], tints }: CanvasProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const light = useRef<HTMLDivElement>(null);
  const inspectable = Boolean(onInspect);
  const glass = Boolean(image && magnify && !dark);
  const magnifier = useMagnifier(glass);

  const ripple = (e: MouseEvent, text: string) => {
    const box = e.currentTarget.closest("[data-scene]")!.getBoundingClientRect();
    const r = { id: Date.now() + Math.random(), x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100, text };
    setRipples((all) => [...all.slice(-2), r]);
    window.setTimeout(() => setRipples((all) => all.filter((x) => x.id !== r.id)), 1400);
  };

  const tap = async (e: MouseEvent, hotspot?: string) => {
    e.stopPropagation();
    if (!onInspect || magnifier.endOfDrag()) return;
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
      {...magnifier.handlers}
      className={cx(
        "relative aspect-[4/3] overflow-hidden rounded-md select-none",
        // In the dark or under the magnifier, a finger dragged across the picture moves the light or lens instead of scrolling.
        (dark || glass) && "touch-none",
        `scene-${look}`,
        inspectable && "cursor-zoom-in",
      )}
    >
      {image && <Image key={image} src={image} alt="" fill sizes={imageSizes} className="pointer-events-none object-cover" draggable={false} onError={onImageError} />}
      {items.map((item, i) => {
        const style = {
          left: `${item.x}%`,
          top: `${item.y}%`,
          width: item.kind === "label" ? undefined : `${item.w}%`,
          height: item.kind === "box" || item.kind === "area" ? `${item.h}%` : undefined,
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
              <span className="scene-mark pointer-events-none absolute top-1/2 left-1/2 z-30 grid size-6 animate-[found-pop_0.4s_ease-out_both] place-items-center rounded-full border-2 border-ink bg-mustard text-xs font-black text-ink shadow-pop-sm">
                ✓
              </span>
            )}
          </span>
        );
      })}
      {dark && <div ref={light} aria-hidden className="flashlight pointer-events-none absolute inset-0 z-20" />}
      {glass && (
        <div
          ref={magnifier.lens}
          aria-hidden
          className="scene-lens pointer-events-none absolute z-20"
          style={{ width: `${LENS * 100}%`, backgroundImage: `url(${image})`, backgroundSize: `${(LENS_ZOOM / LENS) * 100}% auto` }}
        />
      )}
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

/** An illustrated photo or camera still, as a print taped to the desk. Dark photos are searched with a flashlight. */
export function SceneView({ scene, ...rest }: ViewProps & { scene: Scene }) {
  return (
    <figure className={cx("relative mx-auto border-[3px] border-ink bg-white p-2.5 pb-3 shadow-pop-sm", rest.magnify ? "max-w-none" : "max-w-lg rotate-[-0.8deg]")}>
      <span aria-hidden className="obj-tape absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rotate-2" />
      <SceneCanvas look={scene.look} items={scene.items} dark={scene.dark} image={scene.image} {...rest} />
      <figcaption className="mt-2 px-1 text-center font-hand text-lg leading-tight text-ink/80">
        {scene.dark && <span className="block">Pitch dark: drag across it to shine your light.</span>}
        {scene.caption}
      </figcaption>
    </figure>
  );
}

const picture = (scene: Scene | Footage) => ({
  look: scene.look,
  items: scene.type === "scene" ? scene.items : scene.frames[0].items,
  image: scene.type === "scene" ? scene.image : scene.frames[0].image,
});

/** A small still of a photo or the first frame of footage. Nothing to tap. */
export function SceneThumb({ scene }: { scene: Scene | Footage }) {
  return (
    <span className="pointer-events-none block">
      <SceneCanvas {...picture(scene)} />
    </span>
  );
}

const ZOOM = 2.6;

/** The part of a picture a detail was spotted in, blown up. Stays inside the frame, so there's never a blank edge. */
export function ZoomedSpot({ scene, hotspot, className }: { scene: EvidenceBody; hotspot: string; className?: string }) {
  if (scene.type !== "scene" && scene.type !== "footage") return null;
  const shot = scene.type === "scene" ? scene : (scene.frames.find((f) => f.items.some((i) => i.hotspot === hotspot)) ?? scene.frames[0]);
  const items = shot.items;
  const spot = items.find((i) => i.hotspot === hotspot);
  const width = spot && "w" in spot ? spot.w : 10;
  const height = spot && "h" in spot ? spot.h : width;
  const limit = 50 - 50 / ZOOM;
  const shift = (at: number) => Math.max(-limit, Math.min(limit, 50 - at));
  const transform = spot ? `scale(${ZOOM}) translate(${shift(spot.x + width / 2)}%, ${shift(spot.y + height / 2)}%)` : undefined;
  return (
    <span className={cx("pointer-events-none block aspect-[4/3] overflow-hidden", className)}>
      <span className="block" style={{ transform }}>
        <SceneCanvas look={scene.look} items={items} image={shot.image} />
      </span>
    </span>
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
    <figure className={cx("obj-monitor mx-auto rounded-[1.4rem] border-[3px] border-ink p-3 pb-2.5 text-cream shadow-pop-sm", rest.magnify ? "max-w-none" : "max-w-lg")}>
      <div className="obj-monitor-screen relative overflow-hidden rounded-xl border-[3px] border-black">
        {/* Every painted frame loads up front, so scrubbing never lands on a blank one. */}
        {footage.frames.map((f) => f.image && <Image key={f.time} src={f.image} alt="" fill sizes={IMAGE_SIZES} loading="eager" className="pointer-events-none opacity-0" />)}
        <SceneCanvas key={frame} look={footage.look} items={current.items} image={current.image} {...rest} />
        <span className="pointer-events-none absolute top-2 left-2 z-30 flex items-center gap-1 font-printer text-lg leading-none text-[#ff5a4f]">
          <span className="size-2 animate-pulse rounded-full bg-[#ff5a4f]" /> REC
        </span>
        <span className="pointer-events-none absolute right-2 bottom-1.5 z-30 font-printer text-lg leading-none text-white [text-shadow:0_1px_2px_#000]">{current.time}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => {
            if (frame >= last) setFrame(0);
            setPlaying((p) => !p);
          }}
          className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-black bg-[#c9c4b8] text-ink shadow-[0_2px_0_#000]"
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
        <span className="shrink-0 font-printer text-lg leading-none text-[#7ee787]">
          {frame + 1}/{footage.frames.length}
        </span>
      </div>
      <figcaption className="mt-1.5 flex items-center gap-2 px-1 text-xs font-extrabold text-cream/65">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#7ee787] shadow-[0_0_6px_#7ee787]" />
        {footage.caption}
      </figcaption>
    </figure>
  );
}
