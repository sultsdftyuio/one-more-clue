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
import case001Plate0 from "@/assets/world/case-001/plate-0.webp";
import case001Plate1 from "@/assets/world/case-001/plate-1.webp";
import case001PlateMap from "@/assets/world/case-001/plate-map.webp";
import case001Cast0 from "@/assets/world/case-001/cast-0.webp";
import case001Cast1 from "@/assets/world/case-001/cast-1.webp";
import type { WorldArt } from "./scene";

const ART: Record<string, WorldArt> = {
  "case-001": {
    // The plate's two tiles, left to right (case-001.building.ts places them).
    plates: [case001Plate0.src, case001Plate1.src],
    plateMap: case001PlateMap.src,
    // The characters (art/world/cast_sprites.py), in the order src/lib/world/sprites.ts lists them.
    sheets: [case001Cast0.src, case001Cast1.src],
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
