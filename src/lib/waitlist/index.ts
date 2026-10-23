import { createFileStore } from "./file-store";
import { createRedisStore, redisConfigured } from "./redis-store";
import type { WaitlistStore } from "./types";

/**
 * Redis whenever it is configured. Without it, local development falls back to
 * a JSON file, but a deployment fails loudly rather than dropping signups.
 */
export function getWaitlistStore(): WaitlistStore {
  if (redisConfigured()) return createRedisStore();
  if (process.env.NODE_ENV !== "production") return createFileStore();
  throw new Error("Waitlist storage is not configured. Connect Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN).");
}

export { cleanSource, normalizeEmail } from "./validate";
export type { JoinResult } from "./types";
