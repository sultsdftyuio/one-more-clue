"use client";

import Image from "next/image";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MAX_SHOT_ZOOM, MIN_SHOT_ZOOM, type Frame } from "@/lib/game/camera";
import type { EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";
import { Icon } from "../ui/Icon";
import { SceneCanvas, type Tints } from "./SceneView";

type Picture = Extract<EvidenceBody, { type: "scene" | "footage" }>;

export type ViewfinderHandle = {
  /** The frame on screen right now, in percent of the picture: exactly what a shot would take. */
  frame: () => Frame;
};

/** Painted scenes have a twice-as-large copy for close-ups, loaded only once the lens is past 2x. */
const hdOf = (image: string) => image.replace("/evidence/", "/evidence/hd/");
const missingHd = new Set<string>();

const clampZoom = (z: number) => Math.min(MAX_SHOT_ZOOM, Math.max(1, z));

/**
 * The Photographer's viewfinder over a picture. Pinch, scroll or use the
 * buttons to zoom; drag to look around. The frame you see is the shot you'll
 * take, and moving it costs nothing: only the shutter spends anything. In the
 * dark, a lamp on the camera lights wherever the frame points.
 */
export const Viewfinder = forwardRef<
  ViewfinderHandle,
  {
    picture: Picture;
    /** For footage: which moment of the tape is in the frame. */
    moment?: number;
    found?: string[];
    tints?: Tints;
    /** Told whenever the zoom settles, so the shutter knows whether it can fire. */
    onZoom?: (zoom: number) => void;
  }
>(function Viewfinder({ picture, moment = 0, found = [], tints, onZoom }, ref) {
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const brackets = useRef<HTMLSpanElement>(null);
  const view = useRef({ zoom: 1, cx: 50, cy: 50 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; mid: { x: number; y: number } } | null>(null);
  const settle = useRef(0);
  const lastSettled = useRef(1);
  const [bucket, setBucket] = useState(1);
  // The parent's callback can change every render; the camera mustn't jump back when it does.
  const zoomed = useRef(onZoom);
  useEffect(() => {
    zoomed.current = onZoom;
  }, [onZoom]);

  const shot = picture.type === "scene" ? picture : (picture.frames[moment] ?? picture.frames[0]);
  const image = shot.image;
  const dark = picture.type === "scene" && Boolean(picture.dark);
  // The close-up copy only comes in past 2x, and only shows once it has loaded, so the picture never blinks.
  const [hd, setHd] = useState(false);
  const [hdShown, setHdShown] = useState(false);
  useEffect(() => setHd(Boolean(image) && bucket >= 2 && !missingHd.has(image!)), [bucket, image]);

  const frameNow = useCallback((): Frame => {
    const { zoom, cx, cy } = view.current;
    const size = 100 / zoom;
    const clamp = (n: number) => Math.min(100 - size, Math.max(0, n));
    return { x: clamp(cx - size / 2), y: clamp(cy - size / 2), w: size, h: size };
  }, []);

  useImperativeHandle(ref, () => ({ frame: frameNow }), [frameNow]);

  /** Puts the picture where the frame says, without a React render: this runs on every finger move. */
  const paint = useCallback(() => {
    const frame = frameNow();
    const { zoom } = view.current;
    view.current.cx = frame.x + frame.w / 2;
    view.current.cy = frame.y + frame.h / 2;
    if (layer.current) {
      layer.current.style.transform = `translate3d(${-zoom * frame.x}%, ${-zoom * frame.y}%, 0) scale(${zoom})`;
      layer.current.style.setProperty("--zoom", String(zoom));
    }
    if (readout.current) readout.current.textContent = `${zoom.toFixed(1)}×`;
    const next = zoom >= 3 ? 3 : zoom >= 2 ? 2 : 1;
    setBucket((b) => (b === next ? b : next));
  }, [frameNow]);

  /** The focus brackets close in once the frame stops moving, with a little beep when the shot is worth taking. */
  const moved = useCallback(() => {
    brackets.current?.classList.add("is-hunting");
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      brackets.current?.classList.remove("is-hunting");
      const zoom = view.current.zoom;
      if (zoom >= MIN_SHOT_ZOOM && Math.abs(zoom - lastSettled.current) > 0.05) play("focus");
      lastSettled.current = zoom;
      zoomed.current?.(zoom);
    }, 260);
  }, []);

  /** Zooms keeping one point of the picture under the same spot of the screen. */
  const zoomAround = useCallback(
    (clientX: number, clientY: number, nextZoom: number) => {
      const box = stage.current?.getBoundingClientRect();
      if (!box) return;
      const before = frameNow();
      const fx = (clientX - box.left) / box.width;
      const fy = (clientY - box.top) / box.height;
      const px = before.x + fx * before.w;
      const py = before.y + fy * before.h;
      const zoom = clampZoom(nextZoom);
      const size = 100 / zoom;
      view.current = { zoom, cx: px - fx * size + size / 2, cy: py - fy * size + size / 2 };
      paint();
      moved();
    },
    [frameNow, moved, paint],
  );

  const panBy = useCallback(
    (dxPx: number, dyPx: number) => {
      const box = stage.current?.getBoundingClientRect();
      if (!box) return;
      const size = 100 / view.current.zoom;
      view.current.cx -= (dxPx / box.width) * size;
      view.current.cy -= (dyPx / box.height) * size;
      paint();
      moved();
    },
    [moved, paint],
  );

  // Each picture opens wide, in the middle (the parent keys the viewfinder by picture), and says so.
  useEffect(() => {
    paint();
    zoomed.current?.(view.current.zoom);
  }, [paint]);

  // Scroll to zoom needs a listener that can stop the page scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAround(e.clientX, e.clientY, view.current.zoom * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAround]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch.current = null;
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const all = [...pointers.current.values()];
    if (all.length === 1) {
      panBy(e.clientX - last.x, e.clientY - last.y);
      return;
    }
    const [a, b] = all;
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (pinch.current && pinch.current.distance > 0) {
      zoomAround(mid.x, mid.y, view.current.zoom * (distance / pinch.current.distance));
      panBy(mid.x - pinch.current.mid.x, mid.y - pinch.current.mid.y);
    }
    pinch.current = { distance, mid };
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  };

  const step = (by: number) => {
    const box = stage.current?.getBoundingClientRect();
    if (box) zoomAround(box.left + box.width / 2, box.top + box.height / 2, view.current.zoom * by);
  };

  return (
    <div className="relative">
      <div
        ref={stage}
        data-coach="viewfinder"
        tabIndex={0}
        role="application"
        aria-label="Viewfinder. Drag to look around, pinch or use plus and minus to zoom."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={(e) => zoomAround(e.clientX, e.clientY, view.current.zoom < 2 ? 2.5 : 1)}
        onKeyDown={(e) => {
          const nudge = 24;
          if (e.key === "ArrowLeft") panBy(nudge, 0);
          else if (e.key === "ArrowRight") panBy(-nudge, 0);
          else if (e.key === "ArrowUp") panBy(0, nudge);
          else if (e.key === "ArrowDown") panBy(0, -nudge);
          else if (e.key === "+" || e.key === "=") step(1.25);
          else if (e.key === "-") step(0.8);
          else return;
          e.preventDefault();
        }}
        className="viewfinder relative aspect-[4/3] cursor-grab touch-none overflow-hidden rounded-xl border-[3px] border-black bg-black outline-none select-none focus-visible:ring-4 focus-visible:ring-mustard active:cursor-grabbing"
      >
        <div ref={layer} className="absolute inset-0 origin-top-left will-change-transform">
          <SceneCanvas
            look={picture.look}
            items={shot.items}
            image={image}
            imageSizes={`(max-width: 640px) ${bucket * 100}vw, ${bucket * 672}px`}
            found={found}
            tints={tints}
          />
          {image && hd && (
            <Image
              key={hdOf(image)}
              src={hdOf(image)}
              alt=""
              fill
              sizes={`(max-width: 640px) ${bucket * 100}vw, ${bucket * 672}px`}
              draggable={false}
              onLoad={() => setHdShown(true)}
              onError={() => {
                missingHd.add(image);
                setHd(false);
                setHdShown(false);
              }}
              className={cx("pointer-events-none z-10 object-cover transition-opacity duration-300", hdShown ? "opacity-100" : "opacity-0")}
            />
          )}
        </div>
        {dark && <div aria-hidden className="camera-lamp pointer-events-none absolute inset-0" />}

        {/* The camera's own marks: thirds, corners, focus. They never point at anything. */}
        <span aria-hidden className="viewfinder-thirds pointer-events-none absolute inset-0" />
        <span aria-hidden className="viewfinder-corners pointer-events-none absolute inset-3" />
        <span ref={brackets} aria-hidden className="viewfinder-focus pointer-events-none absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2" />
        <span ref={readout} aria-hidden className="pointer-events-none absolute top-2 right-2.5 rounded-full bg-black/55 px-2 py-0.5 font-mono text-xs font-bold text-mustard">
          1.0×
        </span>
      </div>

      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5" data-coach="zoom">
        <button type="button" onClick={() => step(1.4)} aria-label="Zoom in" className="grid size-9 place-items-center rounded-full border-2 border-black bg-cream/90 text-ink shadow-[0_2px_0_#000]">
          <span className="font-display text-xl leading-none">+</span>
        </button>
        <button type="button" onClick={() => step(1 / 1.4)} aria-label="Zoom out" className="grid size-9 place-items-center rounded-full border-2 border-black bg-cream/90 text-ink shadow-[0_2px_0_#000]">
          <span className="font-display text-xl leading-none">−</span>
        </button>
      </div>
    </div>
  );
});

/** A little flash and the shutter closing over the frame, the instant a shot is taken. */
export function ShutterFlash({ shotKey }: { shotKey: number }) {
  if (!shotKey) return null;
  return <span key={shotKey} aria-hidden className="shutter-flash pointer-events-none absolute inset-0 z-30 rounded-xl" />;
}

/** The light of a dark room, for pictures with nothing in them yet. */
export function EmptyFrame({ text }: { text: string }) {
  return (
    <div className="grid aspect-[4/3] place-items-center rounded-xl border-[3px] border-black bg-black p-6 text-center">
      <p className="flex flex-col items-center gap-2 font-semibold text-cream/60">
        <Icon name="camera" className="size-8 text-cream/40" />
        {text}
      </p>
    </div>
  );
}

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
};
