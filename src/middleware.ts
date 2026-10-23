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

function secure(response: NextResponse) {
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
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
