"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { cx } from "@/lib/cx";
import { plateToScreen } from "@/lib/world/camera";
import type { CastMember } from "@/lib/world/cast";
import { spriteOf } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";
import { useWorld, useWorldStore } from "./useWorld";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Name tags over everyone's head: DOM text placed from world coordinates, so it stays crisp and
 * readable while the canvas pans (rule 7 of docs/world-overhaul.md). They follow the camera by
 * subscribing to the store and moving their nodes directly, never through a React render, and they
 * fade out as the camera pulls back to the whole building.
 */
export function WorldTags({ plate, cast }: { plate: WorldPlate; cast: Record<string, CastMember> }) {
  const store = useWorldStore();
  const selected = useWorld((s) => s.selected);
  const nodes = useRef(new Map<string, HTMLSpanElement>());

  const tags = useMemo(
    () =>
      plate.people.flatMap((person) => {
        const member = cast[person.id];
        if (!member?.tag) return [];
        return [{ id: person.id, text: member.tag, me: member.me, person }];
      }),
    [plate, cast],
  );

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      const shown = s.viewport.w > 0 ? clamp((s.camera.zoom / s.range.closeUp - 0.45) / 0.2, 0, 1) : 0;
      for (const tag of tags) {
        const node = nodes.current.get(tag.id);
        if (!node) continue;
        // Over their head, wherever they've walked to.
        const { feet, box } = spriteOf(plate, tag.person, s.positions[tag.id]);
        const at = plateToScreen(s.camera, s.viewport, feet.x, box.y + box.h * 0.02);
        node.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        node.style.opacity = String(shown);
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.range !== prev.range || s.positions !== prev.positions) place(s);
    });
  }, [store, tags, plate]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {tags.map((tag) => (
        <span
          key={tag.id}
          ref={(node) => {
            if (node) nodes.current.set(tag.id, node);
            else nodes.current.delete(tag.id);
          }}
          style={{ opacity: 0 }}
          className={cx(
            "absolute top-0 left-0 -mt-1 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold whitespace-nowrap shadow-pop-sm will-change-transform",
            tag.me ? "bg-mustard text-ink" : "bg-cream text-ink",
            selected === tag.id && "ring-2 ring-moon ring-offset-1 ring-offset-ink",
          )}
        >
          {tag.me ? `You · ${tag.text}` : tag.text}
        </span>
      ))}
    </div>
  );
}
