import type { CookieOptionsWithName } from "@supabase/ssr";
import { SITE_URL } from "@/lib/site";

const isLocalHostname = (hostname: string) =>
  ["localhost", "127.0.0.1", "::1"].includes(hostname) || hostname.endsWith(".localhost");

/** Optional: share the session across subdomains, e.g. NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN=.onemoreclue.com */
function cookieDomain() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN?.trim();
  if (!configured) return undefined;
  const leadingDot = configured.startsWith(".");
  const hostname = configured.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].replace(/^\./, "");
  return isLocalHostname(hostname) ? undefined : `${leadingDot ? "." : ""}${hostname}`;
}

export function getSupabaseCookieOptions(): CookieOptionsWithName {
  const site = new URL(SITE_URL);
  const domain = cookieDomain();
  return {
    ...(domain ? { domain } : {}),
    path: "/",
    sameSite: "lax",
    secure: site.protocol === "https:" && !isLocalHostname(site.hostname),
  };
}
