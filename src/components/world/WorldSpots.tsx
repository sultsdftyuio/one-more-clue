"use client";

import { useLayoutEffect, useRef } from "react";
import type { PlayerView } from "@/lib/game/engine";
import type { Ability } from "@/lib/game/types";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import { plateToScreen } from "@/lib/world/camera";
import { toPlate } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldState } from "@/lib/world/store";
import { ROLE_CARD } from "@/components/game/desk/roles/look";
import { Icon, type IconName } from "@/components/game/ui/Icon";
import { useWorldStore } from "./useWorld";

/** Each ability's mark on a spot: the same icons the role cards use elsewhere. */
export const ABILITY_ICON: Record<Ability, IconName> = { search: "search", interview: "mic", inspect: "camera", crosscheck: "board", none: "eye" };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The spots in the building (W2.4): a soft pulse on each thing worth a look, marked with the icon of every role that
 * has something to open there this chapter. The server decides which show (PlayerView.spots), so a spot never hints
 * at a later chapter. A spot one of your roles can use is ringed in mustard. They're DOM buttons placed from world
 * coordinates, like the name tags, so they're crisp, focusable and labelled, and they fade out as the camera pulls
 * back to the whole building.
 */
export function WorldSpots({ plate, view, onOpen }: { plate: WorldPlate; view: PlayerView; onOpen: (spot: WorldSpotView) => void }) {
  const store = useWorldStore();
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const spots = view.spots;

  useLayoutEffect(() => {
    const place = (s: WorldState) => {
      const shown = s.viewport.w > 0 ? clamp((s.camera.zoom / s.range.closeUp - 0.45) / 0.2, 0, 1) : 0;
      for (const spot of spots) {
        const node = nodes.current.get(spot.id);
        if (!node) continue;
        const p = toPlate(plate, spot.x, spot.z);
        const at = plateToScreen(s.camera, s.viewport, p.x, p.y);
        node.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        node.style.opacity = String(shown);
        node.style.visibility = shown > 0.05 ? "visible" : "hidden";
      }
    };
    place(store.getState());
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport || s.range !== prev.range) place(s);
    });
  }, [store, spots, plate]);

  if (view.phase !== "investigation") return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {spots.map((spot) => {
        const roles = spot.roles.map((id) => view.case.roles.find((r) => r.id === id)).filter((r) => r !== undefined);
        const mine = roles.some((r) => view.me.roles.includes(r.id));
        const names = roles.map((r) => r.name).join(" and ");
        return (
          <button
            key={spot.id}
            ref={(node) => {
              if (node) nodes.current.set(spot.id, node);
              else nodes.current.delete(spot.id);
            }}
            type="button"
            onClick={() => onOpen(spot)}
            aria-label={`${spot.name}: for the ${names}${mine ? " (you)" : ""}`}
            style={{ visibility: "hidden" }}
            className="pointer-events-auto absolute top-0 left-0 grid size-11 place-items-center will-change-transform"
          >
            <span aria-hidden="true" className={cx("absolute inset-1 animate-ping rounded-full opacity-60 [animation-duration:2.2s]", mine ? "bg-mustard" : "bg-cream/70")} />
            <span
              aria-hidden="true"
              className={cx(
                "relative flex items-center -space-x-1.5 rounded-full border-2 border-ink p-0.5 shadow-pop-sm",
                mine ? "bg-mustard ring-2 ring-mustard ring-offset-1 ring-offset-ink" : "bg-cream",
              )}
            >
              {roles.map((r) => (
                <span key={r.id} className={cx("grid size-6 place-items-center rounded-full border border-ink", ROLE_CARD[r.ability])}>
                  <Icon name={ABILITY_ICON[r.ability]} className="size-3.5" />
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
