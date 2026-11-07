import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account and auth pages carry noindex themselves; these are never useful to crawl.
      // /new/ opens a real room when its script runs, and /r/ is a private room, so crawlers stay out of both.
      disallow: ["/account", "/auth/", "/api/", "/reset-password", "/new/", "/r/"],
    },
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
