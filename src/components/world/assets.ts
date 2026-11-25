/**
 * Each painted building's pictures (made by scripts/world-assets.py). Static imports give the files
 * content-hashed URLs, so phones cache them for good and a repaint is fetched fresh.
 */
import case001CorridorBench from "@/assets/world/case-001/front/corridor-bench.webp";
import case001Desk from "@/assets/world/case-001/front/desk.webp";
import case001LabBench from "@/assets/world/case-001/front/lab-bench.webp";
import case001LabChair from "@/assets/world/case-001/front/lab-chair.webp";
import case001LaserCutter from "@/assets/world/case-001/front/laser-cutter.webp";
import case001PrinterBench from "@/assets/world/case-001/front/printer-bench.webp";
import case001Stool from "@/assets/world/case-001/front/stool.webp";
import case001WaterCooler from "@/assets/world/case-001/front/water-cooler.webp";
import case001Plate from "@/assets/world/case-001/plate.webp";
import case001PlateMap from "@/assets/world/case-001/plate-map.webp";
import case001Sprites from "@/assets/world/case-001/sprites.webp";
import type { WorldArt } from "./scene";

const ART: Record<string, WorldArt> = {
  "case-001": {
    plate: case001Plate.src,
    plateMap: case001PlateMap.src,
    sprites: case001Sprites.src,
    // The front layer: furniture drawn over whoever stands behind it (plates.ts lists the same ids).
    occluders: {
      desk: case001Desk.src,
      "lab-bench": case001LabBench.src,
      "lab-chair": case001LabChair.src,
      "printer-bench": case001PrinterBench.src,
      stool: case001Stool.src,
      "laser-cutter": case001LaserCutter.src,
      "corridor-bench": case001CorridorBench.src,
      "water-cooler": case001WaterCooler.src,
    },
  },
};

export const worldArt = (caseId: string): WorldArt | null => ART[caseId] ?? null;
