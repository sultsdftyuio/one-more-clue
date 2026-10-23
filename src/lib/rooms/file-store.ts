import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RoomState } from "@/lib/game/types";
import type { RoomStore } from "./types";

const DIR = join(process.cwd(), ".data", "rooms");
const file = (code: string) => join(DIR, `${code}.json`);

// Shared across route bundles in dev: one lock chain per room, and presence in memory.
const shared = globalThis as typeof globalThis & {
  __roomLocks?: Map<string, Promise<unknown>>;
  __roomSeen?: Map<string, Record<string, number>>;
};
const locks = (shared.__roomLocks ??= new Map());
const seen = (shared.__roomSeen ??= new Map());

/** Runs `task` after any earlier task for the same room, so read-compare-write can't interleave. */
function withLock<T>(code: string, task: () => Promise<T>): Promise<T> {
  const run = (locks.get(code) ?? Promise.resolve()).then(task, task);
  locks.set(
    code,
    run.catch(() => undefined),
  );
  return run;
}

const read = (code: string): Promise<RoomState | null> =>
  readFile(file(code), "utf8")
    .then((text) => JSON.parse(text) as RoomState)
    .catch(() => null);

const write = async (state: RoomState) => {
  await mkdir(DIR, { recursive: true });
  await writeFile(file(state.code), JSON.stringify(state, null, 2));
};

/** Local development only: rooms are JSON files in .data/rooms (git-ignored). */
export function createFileStore(): RoomStore {
  return {
    create: (state) =>
      withLock(state.code, async () => {
        if (await read(state.code)) return false;
        await write(state);
        return true;
      }),
    get: read,
    replace: (state, expectedVersion) =>
      withLock(state.code, async () => {
        const current = await read(state.code);
        if (!current || current.version !== expectedVersion) return false;
        await write(state);
        return true;
      }),
    async touch(code, playerId, now) {
      seen.set(code, { ...seen.get(code), [playerId]: now });
    },
    async seen(code) {
      return seen.get(code) ?? {};
    },
  };
}
