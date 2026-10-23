import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Only public pages that exist, so crawlers don't waste time on 404s. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/play`, changeFrequency: "weekly", priority: 0.8 },
  ];
}
