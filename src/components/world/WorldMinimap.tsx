"use client";

import { useLayoutEffect, useRef } from "react";
import { isZoomedOut, roomInView } from "@/lib/world/camera";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";
import { useWorld, useWorldStore } from "./useWorld";

/** The minimap's width in CSS px; its height follows the plate. */
const WIDTH = 160;

/**
 * A small map of the whole building in the corner (W2.2): the painted plate shrunk down, a frame for what the
 * camera shows, a dot for everyone, and each room as a button that takes the camera there. The frame and the
 * room you're in move with the camera through a store subscription, never a React render. It hides when the
 * whole building is already on screen.
 */
export function WorldMinimap({
  plate,
  picture,
  mine,
}: {
  plate: WorldPlate;
  picture: string;
  mine: string | null;
}) {
  const store = useWorldStore();
  const look = useWorld((s) => s.look);
  const shown = useWorld(
    (s) => s.status.stage === "ready" && !isZoomedOut(s.camera, s.range),
  );
  const frame = useRef<HTMLDivElement>(null);
  const rooms = useRef(new Map<string, HTMLButtonElement>());
  const height = Math.round((WIDTH * plate.size.h) / plate.size.w);
  const ext = plate.extent;
  const pct = (x: number, z: number) => ({
    left: `${((x - ext.x0) / (ext.x1 - ext.x0)) * 100}%`,
    top: `${((ext.z1 - z) / (ext.z1 - ext.z0)) * 100}%`,
  });

  useLayoutEffect(() => {
    let current: string | null = null;
    const place = (s: WorldState) => {
      const node = frame.current;
      if (node && s.viewport.w > 0) {
        const k = WIDTH / plate.size.w;
        const w = (s.viewport.w / s.camera.zoom) * k;
        const h = (s.viewport.h / s.camera.zoom) * k;
        node.style.transform = `translate(${(s.camera.x * k - w / 2).toFixed(1)}px, ${(s.camera.y * k - h / 2).toFixed(1)}px)`;
        node.style.width = `${w.toFixed(1)}px`;
        node.style.height = `${h.toFixed(1)}px`;
      }
      const here = roomInView(plate, s.camera);
      if (here === current) return;
      current = here;
      for (const [id, button] of rooms.current)
        button.dataset.here = String(id === here);
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport) place(s);
    });
  }, [store, plate]);

  return (
    <nav
      aria-label="Map of the building"
      hidden={!shown}
      className="pointer-events-auto relative overflow-hidden rounded-xl border-2 border-ink/80 bg-night shadow-pop-sm"
      style={{ width: WIDTH, height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the plate is already a content-hashed static file */}
      <img
        src={picture}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full opacity-80"
      />
      {plate.rooms.map((room) => {
        const a = pct(room.x0, room.z1);
        const b = pct(room.x1, room.z0);
        return (
          <button
            key={room.id}
            ref={(node) => {
              if (node) rooms.current.set(room.id, node);
              else rooms.current.delete(room.id);
            }}
            type="button"
            aria-label={`Show ${room.name}`}
            onClick={() => look({ kind: "room", id: room.id })}
            className="absolute rounded-[3px] border border-cream/25 transition-colors hover:border-cream/80 data-[here=true]:border-mustard data-[here=true]:bg-mustard/15"
            style={{
              left: a.left,
              top: a.top,
              width: `calc(${b.left} - ${a.left})`,
              height: `calc(${b.top} - ${a.top})`,
            }}
          />
        );
      })}
      {plate.people.map((person) => {
        const at = pct(person.x, person.z + 40);
        const me = person.id === mine;
        return (
          <span
            key={person.id}
            aria-hidden="true"
            className={
              me
                ? "pointer-events-none absolute size-2.5 -translate-1/2 rounded-full border-2 border-ink bg-mustard"
                : "pointer-events-none absolute size-1.5 -translate-1/2 rounded-full bg-cream/85"
            }
            style={at}
          />
        );
      })}
      <div
        ref={frame}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 rounded-sm border-2 border-cream shadow-[0_0_0_1px_rgb(0_0_0/0.5)]"
      />
    </nav>
  );
}
