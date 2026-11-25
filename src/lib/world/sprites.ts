/**
 * Case 001's character sheets (W2.3): where each character's moods and walk sit, and which picture to show when.
 * art/world/cast_sprites.py draws them and writes art/world/cast.json; a test keeps FRAMES the same as that list.
 * No React, no Phaser and no `@/` imports, so `node --test` can load it.
 */

/** The five moods every suspect is drawn in (src/lib/cast-art.ts). The detectives only have "idle". */
export type Mood = "idle" | "nervous" | "smug" | "shocked" | "cracked";
export const MOODS: Mood[] = ["idle", "nervous", "smug", "shocked", "cracked"];

/** A walk's three pictures: a wide stance with both feet down, the left foot up, the right foot up. */
export type Step = "walk-a" | "walk-b" | "walk-c";
export type Pose = Mood | Step;

/** The walk plays a, b, a, c, each for STEP_MS. */
export const WALK_CYCLE: Step[] = ["walk-a", "walk-b", "walk-a", "walk-c"];
export const STEP_MS = 130;
/** Walking pace in cm per second: an unhurried stroll, a step every 130 ms. */
export const WALK_CM_PER_S = 135;

/** One tile, in px, and the space round it on a sheet. */
export const TILE = { w: 300, h: 420 };
export const SHEET_GAP = 24;
export const PER_SHEET = 24;

const SUSPECTS = ["priya", "squires", "ozzy", "rena"];
const DETECTIVES = ["sam", "mei", "ali", "jo"];
const STEPS: Step[] = ["walk-a", "walk-b", "walk-c"];

/** Every frame in sheet order: the suspects' moods then walks, then the detectives' standing pose and walks. */
export const FRAMES: [string, Pose][] = [
  ...SUSPECTS.flatMap((id) => [...MOODS, ...STEPS].map((pose): [string, Pose] => [id, pose])),
  ...DETECTIVES.flatMap((id) => (["idle", ...STEPS] as Pose[]).map((pose): [string, Pose] => [id, pose])),
];

/** How many sheets the frames fill. */
export const SHEETS = Math.ceil(FRAMES.length / PER_SHEET);

/** Which sheet and which frame on it show this character in this pose. A mood they're not drawn in falls back to idle. */
export function frameOf(id: string, pose: Pose): { sheet: number; frame: number } | null {
  let n = FRAMES.findIndex(([who, p]) => who === id && p === pose);
  if (n < 0 && pose !== "idle") n = FRAMES.findIndex(([who, p]) => who === id && p === "idle");
  return n < 0 ? null : { sheet: Math.floor(n / PER_SHEET), frame: n % PER_SHEET };
}

/** The pose for someone: their mood while standing, or the walk's picture for how long they've been walking. */
export function poseAt(mood: Mood, walkingMs: number | null): Pose {
  if (walkingMs === null) return mood;
  return WALK_CYCLE[Math.floor(Math.max(0, walkingMs) / STEP_MS) % WALK_CYCLE.length];
}
