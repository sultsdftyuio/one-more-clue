/**
 * Each painted building's pictures (made by scripts/world-assets.py). Static imports give the files
 * content-hashed URLs, so phones cache them for good and a repaint is fetched fresh.
 */
import case001Desk from "@/assets/world/case-001/desk.webp";
import case001Plate from "@/assets/world/case-001/plate.webp";
import case001PlateMap from "@/assets/world/case-001/plate-map.webp";
import case001Sprites from "@/assets/world/case-001/sprites.webp";
import type { WorldArt } from "./scene";

const ART: Record<string, WorldArt> = {
  "case-001": {
    plate: case001Plate.src,
    plateMap: case001PlateMap.src,
    sprites: case001Sprites.src,
    occluders: { desk: case001Desk.src },
  },
};

export const worldArt = (caseId: string): WorldArt | null => ART[caseId] ?? null;
