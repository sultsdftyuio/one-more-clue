import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Redis } from "@upstash/redis";
import { redisConfigured } from "@/lib/waitlist/redis-store";

export type Feedback = {
  code: string;
  caseId: string;
  /** 1 (didn't enjoy it) to 5 (loved it). */
  rating: number;
  comment: string;
  outcome: string;
  stars: number;
  players: number;
  at: string;
};

const KEY = "feedback";
/** Keep the latest few thousand; older ratings fall off. */
const KEPT = 5000;
const FILE = join(process.cwd(), ".data", "feedback.json");

/** Ratings from the reveal screen: a Redis list in production, .data/feedback.json in local dev. */
export async function saveFeedback(entry: Feedback) {
  const useRedis = process.env.NODE_ENV === "production" || process.env.ROOMS_STORE === "redis";
  if (useRedis && redisConfigured()) {
    const redis = Redis.fromEnv();
    await redis.pipeline().lpush(KEY, JSON.stringify(entry)).ltrim(KEY, 0, KEPT - 1).exec();
    return;
  }
  const list: Feedback[] = await readFile(FILE, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => []);
  list.unshift(entry);
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(list.slice(0, KEPT), null, 2));
}
