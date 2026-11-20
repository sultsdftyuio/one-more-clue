/**
 * The world camera as plain numbers, so the Phaser scene and the React overlays agree on it and
 * `node --test` can check it. Positions are plate pixels; `zoom` is CSS pixels per plate pixel
 * (the scene multiplies by the device pixel ratio itself); screens are CSS pixels.
 */
import type { WorldPlate } from "./plates.ts";

/** Where the camera looks: the plate point at the centre of the screen, and how big it's drawn. */
export type Camera = { x: number; y: number; zoom: number };

/** The canvas on screen, in CSS px. */
export type Viewport = { w: number; h: number };

export type ZoomRange = { min: number; max: number; closeUp: number };

/** The close-up shows 1 CSS px per cm, like the "001 · Close-up" board. */
export const CLOSE_UP_PX_PER_CM = 1;
/** The nearest you can pinch in. */
export const MAX_PX_PER_CM = 1.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Zoom limits for this screen: all the way out shows the whole building; the close-up sits between. */
export function zoomRange(view: Viewport, plate: WorldPlate): ZoomRange {
  const fit = Math.min(view.w / plate.size.w, view.h / plate.size.h);
  const max = Math.max(fit, MAX_PX_PER_CM / plate.pxPerCm);
  return { min: fit, max, closeUp: clamp(CLOSE_UP_PX_PER_CM / plate.pxPerCm, fit, max) };
}

/**
 * Keeps the camera on the plate: zoom inside the range, and no empty space past the edges. On an
 * axis where the whole plate fits on screen, the plate is centred instead.
 */
export function clampCamera(cam: Camera, view: Viewport, plate: WorldPlate, range = zoomRange(view, plate)): Camera {
  const zoom = clamp(cam.zoom, range.min, range.max);
  const axis = (pos: number, screen: number, size: number) => {
    const half = screen / zoom / 2;
    return half * 2 >= size ? size / 2 : clamp(pos, half, size - half);
  };
  return { x: axis(cam.x, view.w, plate.size.w), y: axis(cam.y, view.h, plate.size.h), zoom };
}

/** The plate point under a screen point. */
export function screenToPlate(cam: Camera, view: Viewport, sx: number, sy: number) {
  return { x: cam.x + (sx - view.w / 2) / cam.zoom, y: cam.y + (sy - view.h / 2) / cam.zoom };
}

/** Where a plate point shows on screen. */
export function plateToScreen(cam: Camera, view: Viewport, px: number, py: number) {
  return { x: (px - cam.x) * cam.zoom + view.w / 2, y: (py - cam.y) * cam.zoom + view.h / 2 };
}

/** Moves the picture with a finger: `dx`, `dy` are how far it moved on screen. */
export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { x: cam.x - dx / cam.zoom, y: cam.y - dy / cam.zoom, zoom: cam.zoom };
}

/** Zooms to `zoom` keeping the plate point under screen point (fx, fy) where it is, as a pinch does. */
export function zoomAt(cam: Camera, view: Viewport, zoom: number, fx: number, fy: number): Camera {
  const p = screenToPlate(cam, view, fx, fy);
  return { x: p.x - (fx - view.w / 2) / zoom, y: p.y - (fy - view.h / 2) / zoom, zoom };
}

/** The whole building, as far out as it goes. */
export function wholeBuilding(view: Viewport, plate: WorldPlate): Camera {
  return clampCamera({ x: plate.size.w / 2, y: plate.size.h / 2, zoom: zoomRange(view, plate).min }, view, plate);
}

/** A close-up centred on a plate point (as near as the edges allow). */
export function closeUpOn(view: Viewport, plate: WorldPlate, px: number, py: number): Camera {
  return clampCamera({ x: px, y: py, zoom: zoomRange(view, plate).closeUp }, view, plate);
}

/** Whether the camera is zoomed out past halfway between the whole building and the close-up. */
export function isZoomedOut(cam: Camera, range: ZoomRange) {
  return cam.zoom < Math.sqrt(range.min * range.closeUp);
}

/**
 * One frame of easing towards `goal`: exponential, so it doesn't matter how long frames take.
 * Zoom eases in log space, which looks even. Returns the goal itself once close enough.
 */
export function easeCamera(cam: Camera, goal: Camera, dtMs: number, tauMs = 110): Camera {
  const t = 1 - Math.exp(-Math.max(0, dtMs) / tauMs);
  const zoom = Math.exp(Math.log(cam.zoom) + (Math.log(goal.zoom) - Math.log(cam.zoom)) * t);
  const next = { x: cam.x + (goal.x - cam.x) * t, y: cam.y + (goal.y - cam.y) * t, zoom };
  const near = Math.abs(next.x - goal.x) * zoom < 0.25 && Math.abs(next.y - goal.y) * zoom < 0.25 && Math.abs(zoom / goal.zoom - 1) < 0.002;
  return near ? goal : next;
}

/**
 * One frame of a fling's glide: the velocity (CSS px per ms) decays exponentially, as iOS lists do.
 * Returns how far to move the picture this frame and what's left of the velocity (0 once it stops).
 */
export function glide(vx: number, vy: number, dtMs: number, tauMs = 325) {
  const decay = Math.exp(-Math.max(0, dtMs) / tauMs);
  // The distance covered over the frame: the integral of v·e^(-t/τ) from 0 to dt.
  const travel = tauMs * (1 - decay);
  let nvx = vx * decay;
  let nvy = vy * decay;
  if (Math.hypot(nvx, nvy) < 0.02) nvx = nvy = 0;
  return { dx: vx * travel, dy: vy * travel, vx: nvx, vy: nvy };
}

/** Whether two cameras would draw the same picture (to skip needless updates). */
export function sameCamera(a: Camera, b: Camera) {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.zoom - b.zoom) < 1e-5;
}
