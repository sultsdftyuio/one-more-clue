"use client";

import { useEffect, useRef } from "react";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldStore } from "@/lib/world/store";
import type { WorldArt } from "./scene";

/** Dense phones draw at 2x (the plate holds 2 px per cm). `?dpr=3` on the URL tries another cap, for testing. */
function densityCap() {
  const asked = Number(new URLSearchParams(window.location.search).get("dpr"));
  return Number.isFinite(asked) && asked >= 1 && asked <= 4 ? asked : 2;
}

/**
 * The Phaser canvas (W0.4). Phaser is imported here, in the browser, the first time this mounts, so
 * it never runs on the server and no other page downloads it. The scene and the overlays talk
 * through `store`.
 */
export function WorldCanvas({ store, plate, art }: { store: WorldStore; plate: WorldPlate; art: WorldArt }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("./scene")
      .then(({ startWorld }) => {
        if (!cancelled) stop = startWorld(el, { store, plate, art, maxDpr: densityCap() }).stop;
      })
      .catch((error) => {
        console.error(error);
        if (cancelled) return;
        const offline = error instanceof Error && error.name === "ChunkLoadError";
        store.getState().setStatus({
          stage: "failed",
          error: offline ? "The building didn't download. Check your connection and reload." : "This phone couldn't draw the building. Try the classic screens.",
        });
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [store, plate, art]);

  return <div ref={host} role="img" aria-label={plate.label} className="absolute inset-0 touch-none overflow-hidden select-none [-webkit-touch-callout:none]" />;
}
