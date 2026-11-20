/**
 * The presence lab's world: one strip through Case 001's building, rooms side
 * by side in centimetres (widths from art/mockups/case001/world.json), and a
 * walker that wanders it the way a player might.
 */

export const STRIP_ROOMS = [
  { id: "lab4", name: "Lab 4", x0: 0, x1: 424 },
  { id: "corridor", name: "Corridor", x0: 424, x1: 928 },
  { id: "lobby", name: "Lobby", x0: 928, x1: 1432 },
  { id: "carpark", name: "Car park", x0: 1432, x1: 1842 },
  { id: "gate", name: "North gate", x0: 1842, x1: 2014 },
] as const;

export const STRIP_WIDTH = 2014;

/** A brisk walk, about 5 km/h. */
export const WALK_CM_PER_S = 140;

export const roomAt = (x: number) => (STRIP_ROOMS.find((room) => x < room.x1) ?? STRIP_ROOMS[STRIP_ROOMS.length - 1]).id;

export const roomName = (id: string) => STRIP_ROOMS.find((room) => room.id === id)?.name ?? id;

/** Walks towards `target`; with `pauses`, stops 1–4 s at each spot like someone looking at things. */
export class Walker {
  x: number;
  target: number;
  private waitUntil = 0;
  private readonly pauses: boolean;

  constructor(x: number, pauses: boolean) {
    this.x = x;
    this.target = x;
    this.pauses = pauses;
  }

  /** Advances by `dt` seconds at time `now` (ms) and returns the new position. */
  step(now: number, dt: number) {
    const gap = this.target - this.x;
    const stride = WALK_CM_PER_S * dt;
    if (Math.abs(gap) > stride) {
      this.x += Math.sign(gap) * stride;
    } else {
      this.x = this.target;
      if (this.waitUntil === 0) this.waitUntil = now + (this.pauses ? 1000 + Math.random() * 3000 : 0);
      if (now >= this.waitUntil) {
        this.target = 20 + Math.random() * (STRIP_WIDTH - 40);
        this.waitUntil = 0;
      }
    }
    return this.x;
  }
}
