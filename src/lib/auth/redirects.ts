export const DEFAULT_POST_AUTH_REDIRECT_PATH = "/account";

/** Where a verified password-reset link lands so the user can set a password. */
export const PASSWORD_RESET_PATH = "/reset-password";

/** Where a reset link that can no longer be used sends the user to get a new one. */
export const RECOVERY_LINK_INVALID_PATH = "/forgot-password?error=recovery_link_invalid";

const AUTH_ENTRY_PATHS = ["/auth/callback", "/forgot-password", "/login", "/register"];

const isAuthEntryPath = (pathname: string) =>
  AUTH_ENTRY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * A same-site path to continue to after signing in, or the fallback. Rejects
 * anything that could leave the site (//evil.com, backslashes, schemes, ..).
 */
export function resolvePostAuthRedirectPath(value: string | null | undefined, fallback = DEFAULT_POST_AUTH_REDIRECT_PATH) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\:]|\.\./.test(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, "https://app.local");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://app.local") return fallback;
  if (parsed.pathname === "/" || isAuthEntryPath(parsed.pathname)) return fallback;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
