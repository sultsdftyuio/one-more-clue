/**
 * The Photographer's camera: what a framed shot catches. Pictures are 4:3 and
 * a frame keeps that shape, so a frame is its zoom (100 / width) and where it
 * points. Everything is in percent of the picture.
 *
 * A shot catches the clue that fills the most of the frame, as long as its
 * centre is in the frame, it fills enough of it, and most of the clue is in
 * shot (or it fills at least half the frame). Nothing hints before the shot,
 * so the frame can't be swept around like a detector: a shot of nothing costs
 * time (see clock.ts).
 */
import type { EvidenceBody, SceneItem } from "./types";

export type Frame = { x: number; y: number; w: number; h: number };

/** Shots need this much zoom: a whole-picture snapshot reads nothing. */
export const MIN_SHOT_ZOOM = 1.5;
/** As close as the lens goes. */
export const MAX_SHOT_ZOOM = 5;
/** A clue has to fill at least this share of the frame. */
export const MIN_FILL = 0.08;
/** And this share of the clue has to be in shot, unless it fills half the frame anyway. */
export const MIN_COVER = 0.6;

/** A tap area's box. Older drawn scenes size items by width only, so those count as square. */
function box(item: SceneItem) {
  const w = "w" in item ? item.w : 10;
  const h = "h" in item && typeof item.h === "number" ? item.h : w;
  return { x: item.x, y: item.y, w, h };
}

/** A frame from a player, made safe: numbers only, inside the picture, the right shape. */
export function cleanFrame(raw: unknown): Frame | null {
  if (!raw || typeof raw !== "object") return null;
  const { x, y, w } = raw as Record<string, unknown>;
  if (![x, y, w].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const size = Math.min(100, Math.max(100 / MAX_SHOT_ZOOM, w as number));
  const clamp = (n: number) => Math.min(100 - size, Math.max(0, n));
  return { x: clamp(x as number), y: clamp(y as number), w: size, h: size };
}

/** How far a frame is zoomed in. */
export const zoomOf = (frame: Frame) => 100 / frame.w;

/** The clue a framed shot catches, from the hotspots on offer, or null. */
export function framedHotspot(items: SceneItem[], frame: Frame, offered: (hotspot: string) => boolean = () => true): string | null {
  let best: { hotspot: string; fill: number } | null = null;
  for (const item of items) {
    if (!item.hotspot || !offered(item.hotspot)) continue;
    const b = box(item);
    const across = Math.max(0, Math.min(frame.x + frame.w, b.x + b.w) - Math.max(frame.x, b.x));
    const down = Math.max(0, Math.min(frame.y + frame.h, b.y + b.h) - Math.max(frame.y, b.y));
    const inShot = across * down;
    const fill = inShot / (frame.w * frame.h);
    const cover = inShot / (b.w * b.h);
    const [cx, cy] = [b.x + b.w / 2, b.y + b.h / 2];
    const centred = cx >= frame.x && cx <= frame.x + frame.w && cy >= frame.y && cy <= frame.y + frame.h;
    if (!centred || fill < MIN_FILL || (cover < MIN_COVER && fill < 0.5)) continue;
    if (!best || fill > best.fill) best = { hotspot: item.hotspot, fill };
  }
  return best?.hotspot ?? null;
}

/** A frame of a given width centred on a clue, kept inside the picture. */
function centredOn(item: SceneItem, size: number): Frame {
  const b = box(item);
  const clamp = (n: number) => Math.min(100 - size, Math.max(0, n));
  return { x: clamp(b.x + b.w / 2 - size / 2), y: clamp(b.y + b.h / 2 - size / 2), w: size, h: size };
}

/**
 * How a careful Photographer frames a clue: point at it and zoom in until it's
 * the thing the shot is of. The widest such frame, or the tightest the lens
 * allows. For bots and tests.
 */
export function frameFor(items: SceneItem[], hotspot: string): Frame | null {
  const item = items.find((i) => i.hotspot === hotspot);
  if (!item) return null;
  for (let zoom = MIN_SHOT_ZOOM; zoom <= MAX_SHOT_ZOOM + 1e-9; zoom += 0.1) {
    const frame = centredOn(item, 100 / zoom);
    if (framedHotspot(items, frame) === hotspot) return frame;
  }
  return centredOn(item, 100 / MAX_SHOT_ZOOM);
}

/** Where to point the camera to catch a clue: the frame, and for footage which moment of the tape. For bots and tests. */
export function shotOf(body: EvidenceBody, hotspot: string): { frame: Frame; at?: number } | null {
  if (body.type === "scene") {
    const frame = frameFor(body.items, hotspot);
    return frame ? { frame } : null;
  }
  if (body.type === "footage") {
    for (const [at, moment] of body.frames.entries()) {
      const frame = frameFor(moment.items, hotspot);
      if (frame) return { frame, at };
    }
  }
  return null;
}
