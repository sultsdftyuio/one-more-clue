import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { redisConfigured } from "@/lib/waitlist/redis-store";

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

/** Generous for a group playing normally, tight enough to stop a script. */
const RULES = {
  create: [8, "10 m"],
  join: [30, "10 m"],
  act: [120, "1 m"],
  live: [40, "10 m"],
  feedback: [6, "10 m"],
} satisfies Record<string, [number, Window]>;

export type Bucket = keyof typeof RULES;

let limiters: Record<Bucket, Ratelimit> | null = null;

/** Limits apply wherever rooms live in Redis (production, or ROOMS_STORE=redis). */
const enabled = () => (process.env.NODE_ENV === "production" || process.env.ROOMS_STORE === "redis") && redisConfigured();

/** True when `key` (usually an IP address) may go ahead. */
export async function allowed(bucket: Bucket, key: string) {
  if (!enabled()) return true;
  limiters ??= Object.fromEntries(
    Object.entries(RULES).map(([name, [tokens, window]]) => [
      name,
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(tokens, window),
        prefix: `rl:${name}`,
        // Remembers blocked keys in memory, so a flood doesn't cost Redis calls.
        ephemeralCache: new Map(),
      }),
    ]),
  ) as Record<Bucket, Ratelimit>;
  try {
    return (await limiters[bucket].limit(key)).success;
  } catch {
    // If the limiter itself fails, let the player through rather than block a game.
    return true;
  }
}
