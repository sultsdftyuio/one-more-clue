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
import { useWorld, useWorldStore } from "./useWorld";

/** Each ability's mark on a spot: the same icons the role cards use elsewhere. */
export const ABILITY_ICON: Record<Ability, IconName> = { search: "search", interview: "mic", inspect: "camera", crosscheck: "board", none: "eye" };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** How long to hold a spot to ping it. */
const HOLD_MS = 500;

/**
 * The spots in the building (W2.4): a soft pulse on each thing worth a look, marked with the icon of every role that
 * has something to open there this chapter. The server decides which show (PlayerView.spots), so a spot never hints
 * at a later chapter. A spot one of your roles can use is ringed in mustard. They're DOM buttons placed from world
 * coordinates, like the name tags, so they're crisp, focusable and labelled, and they fade out as the camera pulls
 * back to the whole building.
 */
export function WorldSpots({
  plate,
  view,
  onOpen,
  onPing,
}: {
  plate: WorldPlate;
  view: PlayerView;
  onOpen: (spot: WorldSpotView) => void;
  /** Held for half a second: point the team at it (W3.1) instead of opening it. */
  onPing?: (spot: WorldSpotView) => void;
}) {
  const store = useWorldStore();
  const rewinding = useWorld((s) => s.rewind.open);
  const near = useWorld((s) => s.near);
  const hold = useRef<{ timer: number; fired: boolean } | null>(null);
  const press = (spot: WorldSpotView) => {
    if (!onPing) return;
    const h = { timer: 0, fired: false };
    h.timer = window.setTimeout(() => {
      h.fired = true;
      onPing(spot);
    }, HOLD_MS);
    hold.current = h;
  };
  const release = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
  };
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
  }, [store, spots, plate, near]);

  if (view.phase !== "investigation" || rewinding) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {spots.map((spot) => {
        const roles = spot.roles.map((id) => view.case.roles.find((r) => r.id === id)).filter((r) => r !== undefined);
        const mine = roles.some((r) => view.me.roles.includes(r.id));
        const names = roles.map((r) => r.name).join(" and ");
        const close = near?.kind === "spot" && near.id === spot.id;
        // Far away, only a faint shimmer on your own role's things (and nothing on others'); walk up and it glows.
        if (!close && !mine) return null;
        return (
          <button
            key={spot.id}
            ref={(node) => {
              if (node) nodes.current.set(spot.id, node);
              else nodes.current.delete(spot.id);
            }}
            type="button"
            tabIndex={close ? 0 : -1}
            onPointerDown={() => press(spot)}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              // A hold that pinged doesn't also open the spot; one far away opens only once you walk up to it.
              if (hold.current?.fired) {
                hold.current = null;
                return;
              }
              if (close) onOpen(spot);
            }}
            aria-label={close ? `${spot.name}: for the ${names}${mine ? " (you)" : ""}. Use it.` : `${spot.name}: walk up to it to use it. Hold to point the team at it.`}
            style={{ visibility: "hidden" }}
            className={cx("absolute top-0 left-0 grid place-items-center will-change-transform", close ? "pointer-events-auto size-40" : "pointer-events-auto size-10 cursor-default")}
          >
            {close ? (
              <>
                <span aria-hidden="true" className="world-glow-spot absolute inset-0 rounded-full" />
                <span aria-hidden="true" className="absolute inset-5 animate-ping rounded-full border-2 border-mustard [animation-duration:1.4s]" />
                <span aria-hidden="true" className="relative flex items-center -space-x-1.5 rounded-full border-2 border-ink bg-mustard p-0.5 shadow-pop-sm">
                  {roles.map((r) => (
                    <span key={r.id} className={cx("grid size-7 place-items-center rounded-full border border-ink", ROLE_CARD[r.ability])}>
                      <Icon name={ABILITY_ICON[r.ability]} className="size-4" />
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <span aria-hidden="true" className={cx("world-shimmer block rounded-full", spot.fresh ? "size-4 bg-teal" : "size-3 bg-mustard/80")} />
            )}
            {spot.fresh && (
              <span aria-hidden="true" className="world-fresh absolute -top-3 -right-1 grid size-6 place-items-center rounded-full border-2 border-ink bg-teal text-ink shadow-pop-sm">
                <Icon name="sparkle" className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
