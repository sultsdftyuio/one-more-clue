import { Redis } from "@upstash/redis";
import type { WaitlistStore } from "./types";

const EMAILS = "waitlist:emails";

/** Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*. */
export function redisConfigured() {
  const env = process.env;
  return Boolean(
    (env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL) && (env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN),
  );
}

/** Emails live in one set (so duplicates are free to detect); details in a hash per email. */
export function createRedisStore(): WaitlistStore {
  const redis = Redis.fromEnv();
  return {
    async add({ email, source, createdAt }) {
      const added = await redis.sadd(EMAILS, email);
      if (!added) return "already";
      await redis.hset(`waitlist:entry:${email}`, { source, createdAt });
      return "added";
    },
  };
}
