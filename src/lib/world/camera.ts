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

/** The close-up shows at least 1 CSS px per cm, like the "001 · Close-up" board (a phone shows about a room). */
export const CLOSE_UP_PX_PER_CM = 1;
/** On a bigger screen the close-up frames about one room's width or one floor's height, up to this. */
const CLOSE_UP_MAX_PX_PER_CM = 1.8;
/** The nearest you can zoom in: the plate's own sharpness (2 px per cm), so nothing is blown up past it. */
export const MAX_PX_PER_CM = 2;

/** The close-up for this screen, in CSS px per cm: a room across or a floor high, whichever is smaller. */
export const closeUpPxPerCm = (view: Viewport) => clamp(Math.min(view.w / 420, view.h / 430), CLOSE_UP_PX_PER_CM, CLOSE_UP_MAX_PX_PER_CM);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Zoom limits for this screen: all the way out shows the whole building; the close-up sits between. */
/** Room kept clear above and below the whole building, for the HUD at the top and the dock at the bottom (CSS px). */
export const HUD_ROOM = 84;

export function zoomRange(view: Viewport, plate: WorldPlate): ZoomRange {
  // All the way out, the whole building fits between the HUD and the dock.
  const fit = Math.min(view.w / plate.size.w, Math.max(view.h * 0.5, view.h - HUD_ROOM * 2) / plate.size.h);
  const max = Math.max(fit, MAX_PX_PER_CM / plate.pxPerCm);
  return { min: fit, max, closeUp: clamp(closeUpPxPerCm(view) / plate.pxPerCm, fit, max) };
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

// ---------------------------------------------------------------------------
// Rooms: swiping between them (W2.2)

/** A fling at least this fast (CSS px per ms) in close-up goes to the next room; slower ones just glide. */
export const SWIPE_MIN = 0.45;
/** A page has to move the picture at least this far on screen (CSS px), or the swipe just glides. */
const PAGE_MIN_PX = 48;

export type Direction = "left" | "right" | "up" | "down";

type RoomRect = { id: string; x: number; y: number; w: number; h: number };

/** The rooms as plate-pixel rectangles. */
function roomRects(plate: WorldPlate): RoomRect[] {
  return plate.rooms.map((r) => ({
    id: r.id,
    x: (r.x0 - plate.extent.x0) * plate.pxPerCm,
    y: (plate.extent.z1 - r.z1) * plate.pxPerCm,
    w: (r.x1 - r.x0) * plate.pxPerCm,
    h: (r.z1 - r.z0) * plate.pxPerCm,
  }));
}

/** The room the camera is looking at: the one under the middle of the screen, or else the nearest. */
export function roomInView(plate: WorldPlate, cam: Camera): string | null {
  let best: { id: string; d: number } | null = null;
  for (const r of roomRects(plate)) {
    const dx = Math.max(r.x - cam.x, 0, cam.x - (r.x + r.w));
    const dy = Math.max(r.y - cam.y, 0, cam.y - (r.y + r.h));
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = { id: r.id, d };
  }
  return best?.id ?? null;
}

/**
 * The room next to `from` in a direction, or null at the edge of the building. Rooms ahead are scored by how far
 * ahead they are plus twice how far off to the side, so the lobby (beside the way out) beats the corridor (above it).
 */
export function nextRoom(plate: WorldPlate, from: string, dir: Direction): string | null {
  const rects = roomRects(plate);
  const here = rects.find((r) => r.id === from);
  if (!here) return null;
  const centre = (r: RoomRect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const c = centre(here);
  let best: { id: string; score: number } | null = null;
  for (const r of rects) {
    if (r.id === from) continue;
    const o = centre(r);
    const ahead = dir === "right" ? o.x - c.x : dir === "left" ? c.x - o.x : dir === "down" ? o.y - c.y : c.y - o.y;
    const side = dir === "left" || dir === "right" ? Math.abs(o.y - c.y) : Math.abs(o.x - c.x);
    if (ahead <= 0) continue;
    const score = ahead + 2 * side;
    if (!best || score < best.score) best = { id: r.id, score };
  }
  return best?.id ?? null;
}

/** Centred on a room, at this zoom but never further out than the close-up (as near as the edges allow). */
export function onRoom(view: Viewport, plate: WorldPlate, roomId: string, zoom: number, range = zoomRange(view, plate)): Camera | null {
  const r = roomRects(plate).find((x) => x.id === roomId);
  if (!r) return null;
  return clampCamera({ x: r.x + r.w / 2, y: r.y + r.h / 2, zoom: Math.max(zoom, range.closeUp) }, view, plate, range);
}

/**
 * Where a fling takes the camera. In close-up (or nearer), a quick swipe pages to the next room the way the finger
 * pulls the picture: swipe left to see the room on the right. Null means glide as usual (zoomed out, too slow,
 * or nothing that way).
 */
export function swipeTarget(cam: Camera, view: Viewport, plate: WorldPlate, vx: number, vy: number, range = zoomRange(view, plate)): Camera | null {
  if (cam.zoom < range.closeUp * 0.9 || Math.hypot(vx, vy) < SWIPE_MIN) return null;
  const dir: Direction = Math.abs(vx) >= Math.abs(vy) ? (vx < 0 ? "right" : "left") : vy < 0 ? "down" : "up";
  const here = roomInView(plate, cam);
  const next = here ? nextRoom(plate, here, dir) : null;
  const goal = next ? onRoom(view, plate, next, cam.zoom, range) : null;
  if (!goal) return null;
  // On a tall screen both floors already show, so paging up or down would barely move: glide instead.
  const from = clampCamera(cam, view, plate, range);
  return Math.hypot(goal.x - from.x, goal.y - from.y) * goal.zoom >= PAGE_MIN_PX ? goal : null;
}

/** After a pinch: let go past halfway out and the camera settles on the whole building. Null leaves it where it is. */
export function pinchSettle(cam: Camera, view: Viewport, plate: WorldPlate, range = zoomRange(view, plate)): Camera | null {
  return cam.zoom > range.min * 1.001 && isZoomedOut(cam, range) ? wholeBuilding(view, plate) : null;
}
