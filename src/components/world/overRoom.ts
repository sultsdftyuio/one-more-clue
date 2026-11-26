import { plateToScreen } from "@/lib/world/camera";
import { roomBox } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";

/** A room's box on screen right now, in CSS px, or null for a room off the plate. */
export function roomOnScreen(plate: WorldPlate, s: Pick<WorldState, "camera" | "viewport">, roomId: string) {
  const room = plate.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const box = roomBox(plate, room);
  const a = plateToScreen(s.camera, s.viewport, box.x, box.y);
  const b = plateToScreen(s.camera, s.viewport, box.x + box.w, box.y + box.h);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

/** Moves a node to cover a room, the way the name tags follow the camera: no React render per frame. */
export function coverRoom(node: HTMLElement, plate: WorldPlate, s: Pick<WorldState, "camera" | "viewport">, roomId: string) {
  const r = roomOnScreen(plate, s, roomId);
  if (!r) {
    node.style.visibility = "hidden";
    return;
  }
  node.style.visibility = "visible";
  node.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0)`;
  node.style.width = `${r.w.toFixed(1)}px`;
  node.style.height = `${r.h.toFixed(1)}px`;
}
