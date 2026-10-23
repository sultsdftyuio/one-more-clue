import type { RoomState } from "@/lib/game/types";

/** Rooms disappear a day after their last change. */
export const ROOM_TTL_SECONDS = 60 * 60 * 24;

export type RoomStore = {
  /** Saves a new room. False if the code is already taken. */
  create(state: RoomState): Promise<boolean>;
  get(code: string): Promise<RoomState | null>;
  /**
   * Saves `state` only if the stored room is still at `expectedVersion`, so two
   * players acting at once can't overwrite each other. False means retry.
   */
  replace(state: RoomState, expectedVersion: number): Promise<boolean>;
  /** Records that a player just checked in (presence lives apart from the state). */
  touch(code: string, playerId: string, now: number): Promise<void>;
  /** When each player last checked in, in ms. */
  seen(code: string): Promise<Record<string, number>>;
};
