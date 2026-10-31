import type { Ability } from "@/lib/game/types";

/** Each role's colour on its role card, so the card and the tool under it read as one thing. */
export const ROLE_CARD: Record<Ability, string> = {
  search: "bg-teal text-ink",
  interview: "bg-lilac text-ink",
  inspect: "bg-coral text-cream",
  crosscheck: "bg-mustard text-ink",
  none: "bg-cream text-ink",
};
