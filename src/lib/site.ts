/**
 * The one canonical origin used in metadata, sitemap, auth emails and checkout
 * return URLs. Set NEXT_PUBLIC_SITE_URL to the real domain (e.g.
 * https://www.onemoreclue.com); until then Vercel's own address is used.
 */
function resolveSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withScheme);
  // Never hand out plain-http links from a deployment.
  if (process.env.NODE_ENV === "production" && url.hostname !== "localhost") url.protocol = "https:";
  return url.origin;
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "One More Clue";
export const SITE_DESCRIPTION =
  "Cooperative mystery cases you solve together in the browser. Dig through chats, logs and photos, argue it out, then name the culprit.";

/**
 * When the canonical host is www.example.com, requests for example.com are
 * redirected to it, so the two hosts never compete as duplicate sites.
 */
export function canonicalRedirectHost(requestHost: string): string | null {
  const canonical = new URL(SITE_URL).hostname;
  return canonical.startsWith("www.") && requestHost === canonical.slice(4) ? canonical : null;
}
