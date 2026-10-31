/**
 * Whether the game is open to the public. Test builds (local dev and Vercel
 * previews) always have it; the live site keeps the "get early access" flow
 * until GAME_OPEN=1 is set and the site is redeployed.
 */
export const gameOpen = () =>
  process.env.GAME_OPEN === "1" || process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production";

/** The free case: "Play now" opens a room for it in one tap. */
export const STARTER_CASE = "case-001";

/** Where the landing page's main button goes, and what it honestly says. */
export const playCta = () => (gameOpen() ? { href: `/new/${STARTER_CASE}`, label: "Play now" } : { href: "/play", label: "Get early access" });
