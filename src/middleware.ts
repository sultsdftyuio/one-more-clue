import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolvePostAuthRedirectPath } from "@/lib/auth/redirects";
import { canonicalRedirectHost } from "@/lib/site";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { supabaseConfig } from "@/lib/supabase/env";

const PROTECTED = ["/account"];
const SIGNED_OUT_ONLY = ["/login", "/register"];
const SESSION_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

const matches = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

const DEV = process.env.NODE_ENV !== "production";
// Vercel's toolbar and comments on preview deployments.
const VERCEL_LIVE = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

/**
 * Where pages may load things from. Report-only for now: the browser reports
 * anything that breaks a rule but still loads it, so a missed source can't
 * break the game. Switch the header name to
 * Content-Security-Policy once a few weeks pass without reports.
 * Inline scripts stay allowed because Next.js inlines its own.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com${VERCEL_LIVE}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${VERCEL_LIVE} https://vercel.com`,
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  // LiveKit voice and instant updates; dev adds the hot-reload socket.
  `connect-src 'self' https://*.livekit.cloud wss://*.livekit.cloud${DEV ? " ws:" : ""}${VERCEL_LIVE}${VERCEL_LIVE ? " wss://ws-us3.pusher.com" : ""}`,
  `frame-src 'self'${VERCEL_LIVE}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Checkout, and Google sign-in through Supabase's auth server.
  "form-action 'self' https://*.dodopayments.com https://*.supabase.co https://accounts.google.com",
  // Each report becomes one "[csp]" line in the server logs.
  "report-uri /api/csp-report",
].join("; ");

// Voice chat needs the microphone, on this site only; everything else is off.
const PERMISSIONS_POLICY =
  "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), display-capture=(), browsing-topics=()";

function secure(response: NextResponse) {
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  response.headers.set("Content-Security-Policy-Report-Only", CONTENT_SECURITY_POLICY);
  return response;
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

/**
 * 1. Keep one canonical host (apex -> www); webhooks are exempt because senders don't follow redirects.
 * 2. With Supabase connected: refresh the session cookie, guard /account, and send
 *    signed-in visitors away from the login and register pages.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const host = (request.headers.get("host") ?? request.nextUrl.host).split(":")[0];
  const canonical = canonicalRedirectHost(host);
  if (canonical && !pathname.startsWith("/api/webhooks")) {
    const url = request.nextUrl.clone();
    url.hostname = canonical;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const config = supabaseConfig();
  if (!config) return secure(NextResponse.next());

  // Supabase email links that land on the site root go through the callback.
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("error_code") || (searchParams.has("token_hash") && searchParams.has("type")))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const isProtected = matches(pathname, PROTECTED);
  const isSignedOutOnly = matches(pathname, SIGNED_OUT_ONLY);
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name));

  // Fast path: visitors without a session never need the auth server round-trip.
  if (!hasSessionCookie) {
    return secure(isProtected ? redirectTo(request, "/login", pathname) : NextResponse.next());
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() asks the auth server to validate the token; it is not a local decode.
  let signedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch (error) {
    console.error("[middleware] session check failed", error);
  }

  const carryCookies = (target: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    target.headers.set("Cache-Control", "no-store");
    return secure(target);
  };

  if (!signedIn && isProtected) return carryCookies(redirectTo(request, "/login", pathname));
  if (signedIn && isSignedOutOnly) {
    const next = resolvePostAuthRedirectPath(searchParams.get("next"));
    return carryCookies(NextResponse.redirect(new URL(next, request.url)));
  }
  if (isProtected) response.headers.set("Cache-Control", "no-store");
  return secure(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|twitter-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
