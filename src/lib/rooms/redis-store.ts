import { Redis } from "@upstash/redis";
import type { RoomState } from "@/lib/game/types";
import { ROOM_TTL_SECONDS, type RoomStore } from "./types";

const stateKey = (code: string) => `room:${code}`;
const versionKey = (code: string) => `room:${code}:version`;
const seenKey = (code: string) => `room:${code}:seen`;

/** Compare-and-set: write the room only if its version hasn't moved on. */
const REPLACE = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
return 1
`;

/** Each room is a JSON value plus a version key; presence is a hash of player id → last check-in. */
export function createRedisStore(): RoomStore {
  const redis = Redis.fromEnv();
  return {
    async create(state) {
      const created = await redis.set(stateKey(state.code), JSON.stringify(state), { nx: true, ex: ROOM_TTL_SECONDS });
      if (!created) return false;
      await redis.set(versionKey(state.code), String(state.version), { ex: ROOM_TTL_SECONDS });
      return true;
    },
    async get(code) {
      return redis.get<RoomState>(stateKey(code));
    },
    async version(code) {
      const version = await redis.get<number | string>(versionKey(code));
      return version === null ? null : Number(version);
    },
    async replace(state, expectedVersion) {
      const written = await redis.eval(
        REPLACE,
        [stateKey(state.code), versionKey(state.code)],
        [String(expectedVersion), JSON.stringify(state), String(state.version), String(ROOM_TTL_SECONDS)],
      );
      return written === 1;
    },
    async touch(code, playerId, now) {
      await redis.pipeline().hset(seenKey(code), { [playerId]: now }).expire(seenKey(code), ROOM_TTL_SECONDS).exec();
    },
    async seen(code) {
      const all = await redis.hgetall<Record<string, number>>(seenKey(code));
      return Object.fromEntries(Object.entries(all ?? {}).map(([id, at]) => [id, Number(at)]));
    },
  };
}
