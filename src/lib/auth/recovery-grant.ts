import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { requiredEnv } from "@/lib/supabase/env";
import { PASSWORD_RESET_PATH } from "./redirects";

/**
 * Proof that this browser arrived through a password-reset email.
 *
 * A signed-in session alone must not be enough to set a new password without
 * the current one, or anyone holding a borrowed session could lock the owner
 * out. The auth callback issues this grant only after Supabase verified a
 * recovery link, and the reset form refuses to work without it.
 */
export const RECOVERY_GRANT_COOKIE = "omc-recovery-grant";

// Long enough to pick a password, short enough that a forgotten tab stops working.
export const RECOVERY_GRANT_TTL_SECONDS = 30 * 60;

// The service-role key never reaches the browser; the label keeps these signatures single-purpose.
const sign = (userId: string, expiresAt: number) =>
  createHmac("sha256", requiredEnv("SUPABASE_SERVICE_ROLE_KEY"))
    .update(`password-recovery-grant:${userId}:${expiresAt}`)
    .digest("base64url");

export function createRecoveryGrant(userId: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + RECOVERY_GRANT_TTL_SECONDS;
  return `${expiresAt}.${sign(userId, expiresAt)}`;
}

export function isRecoveryGrantValid(grant: string | undefined, userId: string, now = Date.now()) {
  if (!grant) return false;
  const [rawExpiresAt, signature, ...rest] = grant.split(".");
  const expiresAt = Number(rawExpiresAt);
  if (rest.length > 0 || !signature || !Number.isSafeInteger(expiresAt)) return false;
  if (expiresAt * 1000 <= now) return false;

  const expected = Buffer.from(sign(userId, expiresAt));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const recoveryGrantCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: getSupabaseCookieOptions().secure,
  path: PASSWORD_RESET_PATH, // only the reset page and its form ever read it
  maxAge: RECOVERY_GRANT_TTL_SECONDS,
});
