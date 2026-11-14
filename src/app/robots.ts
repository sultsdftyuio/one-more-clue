import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Account and auth pages carry noindex themselves; these are never useful to crawl.
// /new/ opens a real room when its script runs, so crawlers stay out.
const PRIVATE = ["/account", "/auth/", "/api/", "/reset-password", "/new/"];

// Chat apps fetch a room's page to draw its invite card (several only if robots.txt lets them).
// They read the page's tags and never run its script, so they can't join the room.
const LINK_PREVIEWS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "TelegramBot",
  "WhatsApp",
  "LinkedInBot",
  "SkypeUriPreview",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: LINK_PREVIEWS, allow: "/", disallow: PRIVATE },
      // Search crawlers run a room's script, which would join it as a player, so they stay out of /r/ too.
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, "/r/"] },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
