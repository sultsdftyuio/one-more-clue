import type { MetadataRoute } from "next";
import { gameOpen } from "@/lib/game-open";
import { SITE_URL } from "@/lib/site";

/** Only public pages that exist, so crawlers don't waste time on 404s. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    // Once the game is open, /play just redirects to hosting.
    ...(gameOpen() ? [] : [{ url: `${SITE_URL}/play`, changeFrequency: "weekly" as const, priority: 0.8 }]),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
